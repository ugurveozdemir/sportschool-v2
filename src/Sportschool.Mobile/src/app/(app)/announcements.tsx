import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import {
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useMemberAnnouncements,
  useSchoolAnnouncements,
  useUpdateAnnouncement
} from "@/features/announcements/api";
import type { AnnouncementResponse, SaveAnnouncementRequest } from "@/features/announcements/types";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { Pill, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

type AnnouncementFormState = {
  title: string;
  content: string;
  expiresOn: string;
};

const initialForm: AnnouncementFormState = {
  title: "",
  content: "",
  expiresOn: ""
};

export default function AnnouncementsScreen() {
  const { session } = useSession();
  const canManage = session?.roles.includes("Coach") || session?.roles.includes("SchoolAdmin");
  const memberAnnouncementsQuery = useMemberAnnouncements(!canManage);
  const schoolAnnouncementsQuery = useSchoolAnnouncements(Boolean(canManage));
  const createAnnouncement = useCreateAnnouncement();
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementResponse | null>(null);
  const updateAnnouncement = useUpdateAnnouncement(editingAnnouncement?.id);
  const deleteAnnouncement = useDeleteAnnouncement();
  const [form, setForm] = useState(initialForm);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const announcementsQuery = canManage ? schoolAnnouncementsQuery : memberAnnouncementsQuery;
  const announcements = announcementsQuery.data ?? [];

  if (announcementsQuery.isLoading) {
    return <LoadingState label="Duyurular yükleniyor" />;
  }

  function openCreateForm() {
    setEditingAnnouncement(null);
    setForm(initialForm);
    setIsFormVisible(true);
  }

  function openEditForm(announcement: AnnouncementResponse) {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      expiresOn: announcement.expiresAt ? toDateInputValue(announcement.expiresAt) : ""
    });
    setIsFormVisible(true);
  }

  function submitForm() {
    const request = buildRequest(form);
    if (!request) {
      return;
    }

    const mutation = editingAnnouncement ? updateAnnouncement : createAnnouncement;
    mutation.mutate(request, {
      onSuccess: () => {
        setIsFormVisible(false);
        setEditingAnnouncement(null);
        setForm(initialForm);
      },
      onError: () => Alert.alert("Duyurular", "Duyuru kaydedilemedi.")
    });
  }

  function deactivateAnnouncement(announcement: AnnouncementResponse) {
    Alert.alert("Duyuruyu yayından kaldır", "Bu duyuru mobil kullanıcılara artık görünmez.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Kaldır",
        style: "destructive",
        onPress: () => deleteAnnouncement.mutate(announcement.id, {
          onError: () => Alert.alert("Duyurular", "Duyuru yayından kaldırılamadı.")
        })
      }
    ]);
  }

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>Duyurular</Text>
          <Text style={styles.subtitle}>Kulüp duyurularını tarihleriyle takip edin.</Text>
        </View>
        {canManage ? (
          <Pressable accessibilityLabel="Yeni duyuru yayınla" onPress={openCreateForm} style={styles.createButton}>
            <MaterialCommunityIcons name="plus" size={24} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>

      {announcements.length === 0 ? (
        <SurfaceCard>
          <EmptyState title="Duyuru yok" description="Henüz yayınlanmış bir duyuru bulunmuyor." />
        </SurfaceCard>
      ) : (
        <View style={styles.list}>
          {announcements.map((announcement) => (
            <AnnouncementCard
              announcement={announcement}
              canEdit={Boolean(canManage && (session?.roles.includes("SchoolAdmin") || announcement.createdByUserId === session?.userId))}
              key={announcement.id}
              onDeactivate={() => deactivateAnnouncement(announcement)}
              onEdit={() => openEditForm(announcement)}
            />
          ))}
        </View>
      )}

      <AnnouncementFormModal
        form={form}
        saving={createAnnouncement.isPending || updateAnnouncement.isPending}
        title={editingAnnouncement ? "Duyuruyu Düzenle" : "Yeni Duyuru"}
        visible={isFormVisible}
        onChangeForm={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onClose={() => setIsFormVisible(false)}
        onSubmit={submitForm}
      />
    </ScreenShell>
  );
}

function AnnouncementCard({ announcement, canEdit, onDeactivate, onEdit }: {
  announcement: AnnouncementResponse;
  canEdit: boolean;
  onDeactivate: () => void;
  onEdit: () => void;
}) {
  return (
    <SurfaceCard accent={announcement.isExpired ? "warning" : announcement.isNew ? "secondary" : "primary"} style={announcement.isExpired ? styles.expiredCard : undefined}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{announcement.title}</Text>
          <View style={styles.badgeRow}>
            {announcement.isNew ? <Pill label="Yeni" tone="success" /> : null}
            {announcement.isExpired ? <Pill label="Süresi doldu" tone="warning" /> : null}
          </View>
        </View>
        {canEdit ? (
          <View style={styles.actionRow}>
            <Pressable accessibilityLabel="Duyuruyu düzenle" onPress={onEdit} style={styles.iconButton}>
              <MaterialCommunityIcons name="pencil-outline" size={21} color={colors.primary} />
            </Pressable>
            <Pressable accessibilityLabel="Duyuruyu yayından kaldır" onPress={onDeactivate} style={styles.iconButton}>
              <MaterialCommunityIcons name="trash-can-outline" size={21} color={colors.error} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <Text style={styles.content}>{announcement.content}</Text>
      <View style={styles.metaStack}>
        <Text style={styles.meta}>Yayın: {formatDate(announcement.publishedAt)}</Text>
        <Text style={styles.meta}>Bitiş: {announcement.expiresAt ? formatDate(announcement.expiresAt) : "Süresiz"}</Text>
        {announcement.createdByName ? <Text style={styles.meta}>Yayınlayan: {announcement.createdByName}</Text> : null}
      </View>
    </SurfaceCard>
  );
}

function AnnouncementFormModal({ form, saving, title, visible, onChangeForm, onClose, onSubmit }: {
  form: AnnouncementFormState;
  saving: boolean;
  title: string;
  visible: boolean;
  onChangeForm: (patch: Partial<AnnouncementFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable accessibilityLabel="Formu kapat" onPress={onClose} style={styles.iconButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formStack} keyboardShouldPersistTaps="handled">
            <TextField label="Başlık" onChangeText={(value) => onChangeForm({ title: value })} value={form.title} />
            <TextField
              label="İçerik"
              multiline
              numberOfLines={5}
              onChangeText={(value) => onChangeForm({ content: value })}
              style={styles.textArea}
              textAlignVertical="top"
              value={form.content}
            />
            <TextField
              autoCapitalize="none"
              label="Bitiş tarihi"
              onChangeText={(value) => onChangeForm({ expiresOn: value })}
              placeholder="YYYY-AA-GG"
              value={form.expiresOn}
            />
            <Button disabled={saving} label={saving ? "Kaydediliyor" : "Kaydet"} onPress={onSubmit} />
            <Button disabled={saving} label="Vazgeç" onPress={onClose} variant="outline" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function buildRequest(form: AnnouncementFormState): SaveAnnouncementRequest | null {
  if (!form.title.trim()) {
    Alert.alert("Duyurular", "Lütfen başlığı doldurun.");
    return null;
  }

  if (!form.content.trim()) {
    Alert.alert("Duyurular", "Lütfen içeriği doldurun.");
    return null;
  }

  const expiresAt = parseExpiresAt(form.expiresOn);
  if (expiresAt === false) {
    Alert.alert("Duyurular", "Bitiş tarihini YYYY-AA-GG formatında girin.");
    return null;
  }

  return {
    title: form.title.trim(),
    content: form.content.trim(),
    expiresAt
  };
}

function parseExpiresAt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }

  const date = new Date(`${trimmed}T23:59:59`);
  return Number.isNaN(date.getTime()) ? false : date.toISOString();
}

function toDateInputValue(value: string) {
  return value.slice(0, 10);
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: spacing.xs },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  cardTitle: { ...typography.title, color: colors.primary },
  cardTitleWrap: { flex: 1, gap: spacing.sm },
  content: { ...typography.bodyLarge, color: colors.onSurface, lineHeight: 23 },
  createButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, height: 48, justifyContent: "center", width: 48 },
  expiredCard: { opacity: 0.72 },
  formStack: { gap: spacing.md, paddingBottom: spacing.lg },
  headerRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  headerText: { flex: 1, gap: spacing.xs },
  iconButton: { alignItems: "center", borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  list: { gap: spacing.md },
  meta: { ...typography.label, color: colors.onSurfaceVariant },
  metaStack: { gap: 3 },
  modalBackdrop: { backgroundColor: "rgba(0,0,0,0.32)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "88%", padding: spacing.lg },
  modalTitle: { ...typography.headline, color: colors.primary },
  pageTitle: { ...typography.display, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  textArea: { minHeight: 132 }
});
