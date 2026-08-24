import { useEvent } from "expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useFeed } from "@/features/feed/api";
import type { AthleteFeedVideo } from "@/features/feed/types";
import { SelectedAthleteAvatar } from "@/features/me/ParentAthleteSelector";
import { resolveApiUrl } from "@/shared/api/apiClient";
import { getErrorMessage } from "@/shared/api/apiError";
import { EmptyState } from "@/shared/components/EmptyState";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import { ProfileAvatar, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

export default function FeedScreen() {
  const { session } = useSession();
  const feedQuery = useFeed(Boolean(session));
  const { refetch } = feedQuery;

  useFocusEffect(useCallback(() => {
    if (session) {
      void refetch();
    }
  }, [refetch, session]));

  if (feedQuery.isLoading) {
    return <LoadingState label="Videolar yükleniyor" />;
  }

  if (feedQuery.isError) {
    return <ErrorState
      title="Videolar yüklenemedi"
      description={getErrorMessage(feedQuery.error, "Videolar şu an alınamadı.")}
      onRetry={() => void refetch()}
    />;
  }

  const videos = feedQuery.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <ScreenShell
      title={getShellTitle(session)}
      navItems={getMobileNav(session)}
      avatar={<SelectedAthleteAvatar />}
      contentStyle={styles.content}
      refreshControl={<RefreshControl refreshing={feedQuery.isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />}
    >
      <View style={styles.heading}>
        <Text style={styles.title}>Akademi Videoları</Text>
        <Text style={styles.subtitle}>Okulundaki sporcuların güncel performans videoları.</Text>
      </View>

      {videos.length === 0 ? <SurfaceCard><EmptyState title="Henüz video yok" description="Okul yöneticisi yayınladığında videolar burada görünecek." /></SurfaceCard> : null}
      {videos.map((video) => <FeedVideoCard key={video.id} video={video} onRefresh={() => void refetch()} />)}
      {feedQuery.hasNextPage ? (
        <Pressable disabled={feedQuery.isFetchingNextPage} onPress={() => feedQuery.fetchNextPage()} style={styles.loadMore}>
          <Text style={styles.loadMoreText}>{feedQuery.isFetchingNextPage ? "Videolar yükleniyor…" : "Daha fazla video göster"}</Text>
        </Pressable>
      ) : null}
    </ScreenShell>
  );
}

function FeedVideoCard({ video, onRefresh }: { video: AthleteFeedVideo; onRefresh: () => void }) {
  const source = resolveApiUrl(video.videoUrl);
  const player = useVideoPlayer(source, (createdPlayer) => {
    createdPlayer.loop = false;
  });
  const status = useEvent(player, "statusChange", { status: player.status });
  const athleteName = `${video.athleteFirstName} ${video.athleteLastName}`;

  function retryPlayback() {
    onRefresh();
    void player.replaceAsync(source);
  }

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.authorRow}>
        <ProfileAvatar uri={video.athleteProfileImageUrl ? resolveApiUrl(video.athleteProfileImageUrl) : null} label={video.athleteFirstName.slice(0, 1)} size={38} tone="dark" />
        <View style={styles.authorText}>
          <Text style={styles.authorName}>{athleteName}</Text>
          <Text style={styles.date}>{formatDate(video.publishedAt ?? video.createdAt)}</Text>
        </View>
        <MaterialCommunityIcons name="soccer" size={23} color={colors.secondary} />
      </View>
      <View style={styles.videoContainer}>
        <VideoView player={player} style={styles.video} nativeControls allowsFullscreen />
        {status?.status === "loading" ? <View pointerEvents="none" style={styles.videoOverlay}><ActivityIndicator color={colors.primaryContainer} /></View> : null}
        {status?.status === "error" ? (
          <View style={styles.videoOverlay}>
            <Text style={styles.videoError}>Video şu an oynatılamıyor.</Text>
            <Pressable onPress={retryPlayback} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Videoyu yenile</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {video.caption ? <Text style={styles.caption}>{video.caption}</Text> : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  authorName: { ...typography.title, color: colors.primary },
  authorRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  authorText: { flex: 1, gap: 1 },
  caption: { ...typography.body, color: colors.onSurface, lineHeight: 22 },
  card: { gap: spacing.md, padding: spacing.md },
  content: { gap: spacing.lg },
  date: { ...typography.label, color: colors.onSurfaceVariant },
  heading: { gap: spacing.xs },
  loadMore: { alignItems: "center", borderColor: colors.outline, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  loadMoreText: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.body, color: colors.onSurfaceVariant },
  title: { ...typography.headline, color: colors.primary },
  retryButton: { borderColor: colors.primaryContainer, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  retryButtonText: { ...typography.label, color: colors.primaryContainer },
  video: { backgroundColor: colors.primary, height: 195, width: "100%" },
  videoContainer: { backgroundColor: colors.primary, borderRadius: radius.md, height: 195, overflow: "hidden", width: "100%" },
  videoError: { ...typography.body, color: colors.onSurface, textAlign: "center" },
  videoOverlay: { alignItems: "center", backgroundColor: "rgba(19, 19, 22, 0.82)", gap: spacing.sm, justifyContent: "center", ...StyleSheet.absoluteFillObject }
});
