# 📧 AWS SES Email Configuration

## Cấu hình AWS SES để gửi email mời

### 1. Verify Email Sender (From Address)

Trước khi gửi email, cần verify địa chỉ email gửi trong AWS SES:

```bash
# Ví dụ: noreply@mindmap.app hoặc email của bạn
```

**Cách verify:**
1. Đăng nhập AWS Console → SES → Email Addresses
2. Click "Verify a New Email Address"
3. Nhập email (ví dụ: `noreply@yourdomain.com`)
4. Check inbox và click link verification

### 2. (Production) Request Production Access

Mặc định SES ở **Sandbox mode** - chỉ gửi đến verified emails.

Để gửi đến **bất kỳ email nào**, cần request production access:
- AWS Console → SES → Account Dashboard
- Click "Request Production Access"
- Fill form (use case, expected volume, etc.)

### 3. Environment Variables

Thêm các biến môi trường:

```bash
# AWS Credentials (nếu chưa có AWS CLI configured)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# SES Configuration
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
APP_FRONTEND_BASE_URL=https://yourdomain.com
```

### 4. Testing trong Sandbox Mode

Nếu vẫn ở sandbox mode, verify email người nhận trước:
- AWS Console → SES → Email Addresses → Verify New Email
- Nhập email test → Click verification link

Sau đó test API:
```bash
curl -X POST http://localhost:8080/api/mindmaps/{id}/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "verified-test@gmail.com", "permission": "EDITOR"}'
```

### 5. Alternative: Spring Boot Mail (SMTP)

Nếu không muốn dùng AWS SES, có thể chuyển sang SMTP:

**pom.xml:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

**application.properties:**
```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

---

## Troubleshooting

**Email không gửi được?**
- Check CloudWatch Logs: `/aws/ses/email-sending-errors`
- Verify sender email đã được verify
- Check IAM permissions: `ses:SendEmail`

**"Email not verified"?**
→ SES đang ở sandbox mode, verify email người nhận hoặc request production access
