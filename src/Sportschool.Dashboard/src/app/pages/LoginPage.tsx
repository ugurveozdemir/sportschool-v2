import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useLogin } from "@refinedev/core";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate: login, isPending } = useLogin<LoginFormValues>();

  return (
    <main className="login-page">
      <Card className="login-card" bordered={false}>
        <Typography.Title level={2}>Sportschool</Typography.Title>
        <Typography.Paragraph type="secondary">Yönetim paneline giriş yapın.</Typography.Paragraph>
        {errorMessage && <Alert className="login-alert" type="error" showIcon message={errorMessage} />}
        <Form<LoginFormValues>
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => {
            setErrorMessage(null);
            login(values, {
              onSuccess: (result) => {
                if (!result.success) setErrorMessage(result.error?.message ?? "Giriş yapılamadı.");
              },
              onError: () => setErrorMessage("Giriş yapılamadı. Lütfen tekrar deneyin.")
            });
          }}
        >
          <Form.Item name="email" label="E-posta" rules={[{ required: true, message: "E-posta zorunludur." }, { type: "email", message: "Geçerli bir e-posta girin." }]}>
            <Input prefix={<MailOutlined />} autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Şifre" rules={[{ required: true, message: "Şifre zorunludur." }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={isPending} block>Giriş yap</Button>
        </Form>
      </Card>
    </main>
  );
}
