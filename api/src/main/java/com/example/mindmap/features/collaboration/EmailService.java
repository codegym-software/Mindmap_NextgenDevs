package com.example.mindmap.features.collaboration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

/**
 * Service gửi email qua AWS SES
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final SesClient sesClient;
    
    @Value("${aws.ses.from-email:noreply@mindmap.app}")
    private String fromEmail;
    
    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public EmailService(SesClient sesClient) {
        this.sesClient = sesClient;
    }

    /**
     * Gửi email mời tham gia Mindmap
     */
    public void sendInvitationEmail(
            String toEmail, 
            String inviterName, 
            String mindmapName, 
            String mindmapId,
            String permission
    ) {
        try {
            String subject = String.format("%s đã mời bạn tham gia Mindmap: %s", inviterName, mindmapName);
            
            String permissionText = permission.equals("EDITOR") ? "chỉnh sửa" : "xem";
            String mindmapUrl = frontendBaseUrl + "/editor/" + mindmapId;
            
            String htmlBody = buildInvitationEmailHtml(inviterName, mindmapName, mindmapUrl, permissionText);
            String textBody = buildInvitationEmailText(inviterName, mindmapName, mindmapUrl, permissionText);

            SendEmailRequest emailRequest = SendEmailRequest.builder()
                    .destination(Destination.builder().toAddresses(toEmail).build())
                    .message(Message.builder()
                            .subject(Content.builder().data(subject).charset("UTF-8").build())
                            .body(Body.builder()
                                    .html(Content.builder().data(htmlBody).charset("UTF-8").build())
                                    .text(Content.builder().data(textBody).charset("UTF-8").build())
                                    .build())
                            .build())
                    .source(fromEmail)
                    .build();

            sesClient.sendEmail(emailRequest);
            log.info("✉️ Sent invitation email to {} for mindmap {}", toEmail, mindmapId);
            
        } catch (Exception e) {
            log.error("❌ Failed to send invitation email to {}: {}", toEmail, e.getMessage());
            // Không throw exception để tránh rollback transaction chính
        }
    }

    private String buildInvitationEmailHtml(String inviterName, String mindmapName, String url, String permission) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🧠 Mindmap Collaboration</h1>
                    </div>
                    <div class="content">
                        <p>Xin chào,</p>
                        <p><strong>%s</strong> đã mời bạn <strong>%s</strong> Mindmap: <strong>%s</strong></p>
                        <p>Nhấn vào nút bên dưới để mở Mindmap:</p>
                        <a href="%s" class="button">Mở Mindmap</a>
                        <p style="color: #6b7280; font-size: 14px;">Hoặc copy link sau vào trình duyệt:<br>%s</p>
                    </div>
                    <div class="footer">
                        <p>Email này được gửi tự động từ hệ thống Mindmap.</p>
                    </div>
                </div>
            </body>
            </html>
            """, inviterName, permission, mindmapName, url, url);
    }

    private String buildInvitationEmailText(String inviterName, String mindmapName, String url, String permission) {
        return String.format("""
            Xin chào,
            
            %s đã mời bạn %s Mindmap: %s
            
            Mở Mindmap tại: %s
            
            ---
            Email này được gửi tự động từ hệ thống Mindmap.
            """, inviterName, permission, mindmapName, url);
    }
}
