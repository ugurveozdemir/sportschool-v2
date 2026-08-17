import { LockOutlined } from "@ant-design/icons";
import { useLogout } from "@refinedev/core";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";
import { ApiError } from "../../app/api/apiClient";
import { changePassword } from "./settingsApi";

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function SettingsPage() {
  const [form] = Form.useForm<PasswordFormValues>();
  const { mutate: logout } = useLogout();
  const passwordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) => changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      message.success("Şifreniz değiştirildi. Yeni şifrenizle tekrar giriş yapın.");
      logout();
    },
    onError: (error) => message.error(passwordErrorMessage(error))
  });

  return (
    <div>
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Ayarlar</Typography.Title>
          <Typography.Paragraph type="secondary">Hesap güvenliği ayarlarınızı yönetin.</Typography.Paragraph>
        </div>
      </div>

      <Card title="Şifre değiştir" className="settings-card">
        <Alert
          showIcon
          type="info"
          message="Şifreniz değiştiğinde güvenliğiniz için tüm oturumlar kapatılır."
        />
        <Form<PasswordFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          className="settings-form"
          onFinish={(values) => passwordMutation.mutate(values)}
        >
          <Form.Item name="currentPassword" label="Mevcut şifre" rules={[{ required: true, message: "Mevcut şifre zorunludur." }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Yeni şifre"
            rules={[
              { required: true, message: "Yeni şifre zorunludur." },
              { min: 8, message: "Yeni şifre en az 8 karakter olmalıdır." }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Yeni şifre tekrar"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Yeni şifreyi tekrar girin." },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || value === getFieldValue("newPassword")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Yeni şifreler eşleşmiyor."));
                }
              })
            ]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={passwordMutation.isPending}>Şifreyi değiştir</Button>
        </Form>
      </Card>
    </div>
  );
}

function passwordErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 400) return "Mevcut şifre yanlış.";
  return "Şifre değiştirilemedi. Lütfen tekrar deneyin.";
}
