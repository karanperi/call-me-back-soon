# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Yaad seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue for security vulnerabilities
- Post details about the vulnerability publicly
- Exploit the vulnerability beyond what's necessary to demonstrate it

### Do

1. **Email**: Send details to [security email - to be set up]
2. **Encrypt**: Use our PGP key if available for sensitive details
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Resolution Timeline**: Depends on severity
- **Credit**: With your permission, we'll credit you in our changelog

## Security Best Practices

When contributing to or deploying Yaad:

### Environment Variables

- Never commit `.env` files
- Use Supabase secrets for edge functions
- Rotate API keys periodically

### Authentication

- Always use HTTPS
- Implement proper session management
- Use strong password requirements

### Data Protection

- Enable Row Level Security (RLS) on all tables
- Validate all user input
- Use parameterized queries (handled by Supabase)

### API Security

- Validate authorization headers
- Implement rate limiting
- Use signed URLs for sensitive resources

### Phone Number Handling

- Store in E.164 format only
- Validate format before processing
- Don't expose phone numbers in logs

## Known Security Considerations

### Voice Data

- Voice clones are stored with ElevenLabs
- Audio files have signed URLs with expiration
- Users can delete their voice clones

### Third-Party Services

- Twilio handles call encryption
- ElevenLabs processes voice data
- Supabase manages data encryption at rest

## Security Headers

The application implements:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## Incident Response

In case of a security incident:

1. We will notify affected users within 72 hours
2. We will provide remediation steps
3. We will publish a post-mortem (without sensitive details)

## Contact

For security concerns:
- Email: [to be set up]
- Response time: 48 hours

Thank you for helping keep Yaad secure!
