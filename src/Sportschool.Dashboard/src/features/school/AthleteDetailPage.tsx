import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  UserOutlined,
  VideoCameraOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Descriptions, Empty, Form, Input, Modal, Popconfirm, Result, Skeleton, Space, Switch, Tag, Typography, message } from "antd";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ApiError } from "../../app/api/apiClient";
import { deleteAthleteVideo, deleteProfileImage, listAthleteVideos, setVideoPublication, uploadAthleteVideo, uploadProfileImage, type AthleteVideo } from "./athleteMediaApi";
import { getAthlete } from "./athletesApi";

type VideoFormValues = { caption?: string };

export function AthleteDetailPage() {
  const navigate = useNavigate();
  const { athleteId } = useParams();
  const queryClient = useQueryClient();
  const [videoForm] = Form.useForm<VideoFormValues>();
  const profileImageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const athleteQuery = useQuery({
    enabled: Boolean(athleteId),
    queryKey: ["school", "athletes", athleteId],
    queryFn: () => getAthlete(athleteId!)
  });
  const videosQuery = useQuery({
    enabled: Boolean(athleteId),
    queryKey: ["school", "athletes", athleteId, "videos"],
    queryFn: () => listAthleteVideos(athleteId!)
  });

  const refreshAthlete = () => {
    void queryClient.invalidateQueries({ queryKey: ["school", "athletes"] });
  };
  const refreshVideos = () => {
    void queryClient.invalidateQueries({ queryKey: ["school", "athletes", athleteId, "videos"] });
  };
  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => uploadProfileImage(athleteId!, file),
    onSuccess: () => {
      message.success("Profil fotoğrafı güncellendi.");
      refreshAthlete();
    },
    onError: (error) => message.error(mediaErrorMessage(error))
  });
  const deleteImageMutation = useMutation({
    mutationFn: () => deleteProfileImage(athleteId!),
    onSuccess: () => {
      message.success("Profil fotoğrafı kaldırıldı.");
      refreshAthlete();
    },
    onError: (error) => message.error(mediaErrorMessage(error))
  });
  const uploadVideoMutation = useMutation({
    mutationFn: (values: VideoFormValues) => uploadAthleteVideo(athleteId!, selectedVideo!, values.caption),
    onSuccess: () => {
      message.success("Video eklendi. Yayınlamak için ilgili anahtarı açın.");
      closeVideoModal();
      refreshVideos();
    },
    onError: (error) => message.error(mediaErrorMessage(error))
  });
  const publicationMutation = useMutation({
    mutationFn: ({ videoId, isPublished }: { videoId: string; isPublished: boolean }) => setVideoPublication(videoId, isPublished),
    onSuccess: () => {
      message.success("Video yayın durumu güncellendi.");
      refreshVideos();
    },
    onError: (error) => message.error(mediaErrorMessage(error))
  });
  const deleteVideoMutation = useMutation({
    mutationFn: deleteAthleteVideo,
    onSuccess: () => {
      message.success("Video silindi.");
      refreshVideos();
    },
    onError: (error) => message.error(mediaErrorMessage(error))
  });

  function selectProfileImage(event: React.ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;
    if (!isAllowedImage(image)) {
      message.error("Fotoğraf JPEG, PNG veya WebP olmalı ve 5 MB'ı geçmemelidir.");
      return;
    }
    uploadImageMutation.mutate(image);
  }

  function selectVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const video = event.target.files?.[0];
    event.target.value = "";
    if (!video) return;
    if (!isAllowedVideo(video)) {
      message.error("Video MP4 veya MOV olmalı ve 100 MB'ı geçmemelidir.");
      return;
    }
    setSelectedVideo(video);
    videoForm.resetFields();
    setIsVideoModalOpen(true);
  }

  function closeVideoModal() {
    setSelectedVideo(null);
    videoForm.resetFields();
    setIsVideoModalOpen(false);
  }

  if (athleteQuery.isLoading) {
    return <Card><Skeleton active avatar={{ size: 96 }} paragraph={{ rows: 6 }} /></Card>;
  }

  if (athleteQuery.error instanceof ApiError && athleteQuery.error.status === 404) {
    return (
      <Result
        status="404"
        title="Sporcu bulunamadı"
        subTitle="Sporcu silinmiş, pasife alınmış veya okulunuza ait olmayabilir."
        extra={<Button type="primary" onClick={() => navigate("/sporcular")}>Sporculara dön</Button>}
      />
    );
  }

  if (athleteQuery.isError || !athleteQuery.data) {
    return (
      <Alert
        showIcon
        type="error"
        message="Sporcu bilgileri yüklenemedi."
        description="Lütfen bağlantınızı kontrol edip tekrar deneyin."
        action={<Button onClick={() => void athleteQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  const athlete = athleteQuery.data;
  const fullName = `${athlete.firstName} ${athlete.lastName}`;

  return (
    <div>
      <Button className="detail-back-button" icon={<ArrowLeftOutlined />} onClick={() => navigate("/sporcular")}>
        Sporculara dön
      </Button>

      <Card className="athlete-profile-card">
        <div className="athlete-profile-summary">
          <Avatar size={96} src={athlete.profileImageUrl ?? undefined} icon={<UserOutlined />} />
          <div>
            <Space wrap>
              <Typography.Title level={2}>{fullName}</Typography.Title>
              <Tag color="green">Aktif sporcu</Tag>
            </Space>
            <Typography.Text type="secondary">
              {formatAge(athlete.birthDate)} yaş · {formatDate(athlete.birthDate)} doğumlu
            </Typography.Text>
            <Space className="profile-image-actions" wrap>
              <Button icon={<CameraOutlined />} loading={uploadImageMutation.isPending} onClick={() => profileImageInput.current?.click()}>Fotoğraf değiştir</Button>
              {athlete.profileImageUrl && (
                <Popconfirm title="Profil fotoğrafı kaldırılsın mı?" okText="Kaldır" cancelText="Vazgeç" onConfirm={() => deleteImageMutation.mutate()}>
                  <Button danger icon={<DeleteOutlined />} loading={deleteImageMutation.isPending}>Kaldır</Button>
                </Popconfirm>
              )}
            </Space>
          </div>
        </div>
        <input ref={profileImageInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectProfileImage} />
      </Card>

      <div className="athlete-detail-grid">
        <Card title="Sporcu bilgileri">
          <Descriptions column={1}>
            <Descriptions.Item label={<><CalendarOutlined /> Doğum tarihi</>}>{formatDate(athlete.birthDate)}</Descriptions.Item>
            <Descriptions.Item label={<><UserOutlined /> Yaş</>}>{formatAge(athlete.birthDate)}</Descriptions.Item>
            <Descriptions.Item label={<><MailOutlined /> E-posta</>}>{athlete.email}</Descriptions.Item>
            <Descriptions.Item label="Kayıt tarihi">{formatDateTime(athlete.createdAt)}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Veli bilgileri">
          <Descriptions column={1}>
            <Descriptions.Item label={<><UserOutlined /> Ad soyad</>}>{athlete.parentFullName}</Descriptions.Item>
            <Descriptions.Item label={<><PhoneOutlined /> Telefon</>}>{athlete.parentPhone}</Descriptions.Item>
            <Descriptions.Item label={<><MailOutlined /> E-posta</>}>{athlete.parentEmail ?? "—"}</Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <Card className="athlete-groups-card" title={<Space><TeamOutlined /> Gruplar</Space>}>
        {athlete.groups.length > 0
          ? <Space wrap>{athlete.groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}</Space>
          : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sporcu henüz bir gruba eklenmemiş." />}
      </Card>

      <Card
        className="athlete-videos-card"
        title={<Space><VideoCameraOutlined /> Videolar</Space>}
        extra={<Button type="primary" icon={<VideoCameraOutlined />} onClick={() => videoInput.current?.click()}>Video ekle</Button>}
      >
        <Typography.Paragraph type="secondary">MP4 veya MOV formatında, en fazla 100 MB video ekleyin. Yalnızca yayınlanan videolar sporcu ve velilerin akışında görünür.</Typography.Paragraph>
        <input ref={videoInput} className="visually-hidden" type="file" accept="video/mp4,video/quicktime" onChange={selectVideo} />
        {videosQuery.isLoading
          ? <Skeleton active paragraph={{ rows: 3 }} />
          : (videosQuery.data ?? []).length > 0
            ? <div className="athlete-video-grid">{(videosQuery.data ?? []).map((video) => <VideoCard key={video.id} video={video} publicationPending={publicationMutation.isPending} deletePending={deleteVideoMutation.isPending} onPublicationChange={(isPublished) => publicationMutation.mutate({ videoId: video.id, isPublished })} onDelete={() => deleteVideoMutation.mutate(video.id)} />)}</div>
            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Henüz video eklenmemiş." />}
      </Card>

      <Modal
        title="Video ekle"
        open={isVideoModalOpen}
        okText="Video ekle"
        cancelText="Vazgeç"
        confirmLoading={uploadVideoMutation.isPending}
        onCancel={closeVideoModal}
        onOk={() => videoForm.submit()}
      >
        <Typography.Paragraph><Typography.Text strong>{selectedVideo?.name}</Typography.Text> · {formatFileSize(selectedVideo?.size ?? 0)}</Typography.Paragraph>
        <Form form={videoForm} layout="vertical" onFinish={(values) => uploadVideoMutation.mutate(values)}>
          <Form.Item name="caption" label="Açıklama" rules={[{ max: 300, message: "Açıklama en fazla 300 karakter olabilir." }]}>
            <Input.TextArea rows={3} placeholder="Örn. Teknik gelişim antrenmanı" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function VideoCard({ video, publicationPending, deletePending, onPublicationChange, onDelete }: { video: AthleteVideo; publicationPending: boolean; deletePending: boolean; onPublicationChange: (isPublished: boolean) => void; onDelete: () => void }) {
  const isReady = video.status === "Ready";
  return (
    <div className="athlete-video-card">
      <video className="athlete-video-player" controls preload="metadata" src={video.videoUrl}>Tarayıcınız video oynatmayı desteklemiyor.</video>
      <Space className="athlete-video-meta" wrap>
        <Tag color={video.isPublished ? "green" : "gold"}>{video.isPublished ? "Yayında" : "Taslak"}</Tag>
        {!isReady && <Tag color="red">{video.status === "Processing" ? "İşleniyor" : "Hazırlanamadı"}</Tag>}
        <Typography.Text type="secondary">{formatDateTime(video.createdAt)}</Typography.Text>
      </Space>
      {video.caption && <Typography.Paragraph className="athlete-video-caption">{video.caption}</Typography.Paragraph>}
      <div className="athlete-video-actions">
        <Space>
          <Typography.Text>Yayınla</Typography.Text>
          <Switch checked={video.isPublished} disabled={!isReady || publicationPending} loading={publicationPending} onChange={onPublicationChange} />
        </Space>
        <Popconfirm title="Bu video silinsin mi?" description="Video akıştan da kaldırılır." okText="Sil" cancelText="Vazgeç" onConfirm={onDelete}>
          <Button danger size="small" icon={<DeleteOutlined />} loading={deletePending}>Sil</Button>
        </Popconfirm>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(value));
}

function formatAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const hasNotHadBirthday = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (hasNotHadBirthday) age--;
  return age;
}

function isAllowedImage(file: File): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024;
}

function isAllowedVideo(file: File): boolean {
  return ["video/mp4", "video/quicktime"].includes(file.type) && file.size > 0 && file.size <= 100 * 1024 * 1024;
}

function formatFileSize(bytes: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + " MB";
}

function mediaErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 413) return "Dosya boyutu izin verilen sınırı aşıyor.";
  return "İşlem tamamlanamadı. Dosya türünü ve boyutunu kontrol edip tekrar deneyin.";
}
