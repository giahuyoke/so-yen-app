"use client";

import { Button, Card, Form, Input, List, Popconfirm, Tag } from "antd";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { useInvites, useMembers } from "@/hooks/use-shop-data";
import { cancelInviteAction, inviteMemberAction, removeMemberAction } from "@/server/actions/shop";

export default function MembersPage() {
  const { shop } = useShop();
  const { user } = useAuth();
  const members = useMembers();
  const invites = useInvites();
  const run = useRunAction();
  const [form] = Form.useForm<{ email: string }>();
  const [inviting, setInviting] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Thành viên</h1>

      <Card title="Mời người nhà">
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            setInviting(true);
            const ok = await run(inviteMemberAction(shop.id, values), { success: "Đã gửi lời mời", form });
            setInviting(false);
            if (ok) form.resetFields();
          }}
        >
          <Form.Item
            name="email"
            label="Email Google của người được mời"
            extra="Người được mời chỉ cần đăng nhập Sổ Yến bằng đúng email này là tự vào cửa hàng."
            rules={[{ required: true, type: "email", message: "Nhập email hợp lệ" }]}
          >
            <Input inputMode="email" placeholder="ten@gmail.com" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={inviting}>Mời</Button>
        </Form>
      </Card>

      <Card title="Thành viên" loading={members.loading}>
        <List
          dataSource={members.data}
          renderItem={(m) => (
            <List.Item
              actions={
                m.id === user?.uid
                  ? [<Tag key="me">Bạn</Tag>]
                  : m.id === shop.ownerUid
                    ? [<Tag key="owner" color="gold">Chủ</Tag>]
                    : [
                        <Popconfirm
                          key="remove"
                          title={`Gỡ ${m.displayName} khỏi cửa hàng?`}
                          okText="Gỡ"
                          cancelText="Không"
                          onConfirm={() => run(removeMemberAction(shop.id, { uid: m.id }), { success: "Đã gỡ thành viên" })}
                        >
                          <Button danger size="small">Gỡ</Button>
                        </Popconfirm>,
                      ]
              }
            >
              <List.Item.Meta title={m.displayName} description={m.email} />
            </List.Item>
          )}
        />
      </Card>

      {invites.data.length > 0 && (
        <Card title="Lời mời đang chờ">
          <List
            dataSource={invites.data}
            renderItem={(i) => (
              <List.Item
                actions={[
                  <Button key="cancel" size="small" onClick={() => run(cancelInviteAction(shop.id, { email: i.email }), { success: "Đã hủy lời mời" })}>
                    Hủy
                  </Button>,
                ]}
              >
                {i.email}
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
