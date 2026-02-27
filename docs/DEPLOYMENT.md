# Deployment Guide

This guide covers deploying Yaad to production.

## Deployment Options

### Option 1: Lovable (Recommended)

If you're using Lovable for development:

1. Open your project in [Lovable](https://lovable.dev)
2. Go to Share → Publish
3. Your app is deployed!

### Option 2: Vercel

1. **Connect Repository**
   - Import project from GitHub at [vercel.com/new](https://vercel.com/new)

2. **Configure Build**
   ```
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Set Environment Variables**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

4. **Deploy**
   - Vercel auto-deploys on push to main

### Option 3: Netlify

1. **Connect Repository**
   - Import from GitHub at [netlify.com](https://netlify.com)

2. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Environment Variables**
   - Add in Site settings → Environment variables

4. **Add Redirects**
   Create `public/_redirects`:
   ```
   /* /index.html 200
   ```

### Option 4: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Build and run:
```bash
docker build -t yaad .
docker run -p 80:80 yaad
```

---

## Supabase Production Setup

### 1. Create Production Project

- Go to [supabase.com](https://supabase.com)
- Create a new project for production
- Choose appropriate region (close to users)

### 2. Apply Migrations

```bash
supabase link --project-ref YOUR_PROD_PROJECT_REF
supabase db push
```

### 3. Deploy Edge Functions

```bash
supabase functions deploy --project-ref YOUR_PROD_PROJECT_REF
```

### 4. Set Secrets

```bash
supabase secrets set --project-ref YOUR_PROD_PROJECT_REF \
  ELEVENLABS_API_KEY=your_key \
  TWILIO_ACCOUNT_SID=your_sid \
  TWILIO_AUTH_TOKEN=your_token \
  TWILIO_PHONE_NUMBER=+1234567890 \
  DEEPGRAM_API_KEY=your_deepgram_key \
  ANTHROPIC_API_KEY=your_anthropic_key \
  CRON_SECRET=your_random_secret
```

### 5. Create Storage Bucket

1. Go to Storage in Supabase dashboard
2. Create `call-audio` bucket (private)

### 6. Set Up Cron Job

Enable pg_cron and pg_net, then schedule:

```sql
SELECT cron.schedule(
  'check-reminders-prod',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/check-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', 'YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

> **Note**: The `X-Cron-Secret` value must match the `CRON_SECRET` set in edge function secrets.

---

## Twilio Production Setup

### 1. Upgrade Account

- Upgrade from trial to paid account
- Add payment method
- Request number verification removal (if needed)

### 2. Purchase Phone Number

- Buy a number with Voice capability
- Consider local numbers for target regions

### 3. Configure Number

- No webhook configuration needed (handled in code)
- Enable Voice capability

### 4. Set Geographic Permissions

- Go to Voice → Geo Permissions
- Enable regions where your users will call

---

## ElevenLabs Production Setup

### 1. Choose Plan

- Review character limits per plan
- Consider growth projections

### 2. Generate Production API Key

- Create dedicated production key
- Keep development and production separate

### 3. Monitor Usage

- Set up usage alerts
- Monitor character consumption

---

## Environment Variables Checklist

### Frontend (Build-time)

| Variable | Required | Description |
|----------|----------|-------------|
| VITE_SUPABASE_URL | Yes | Supabase project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Yes | Supabase anon/publishable key |

### Edge Functions (Runtime)

| Secret | Required | Description |
|--------|----------|-------------|
| SUPABASE_URL | Auto | Provided by Supabase |
| SUPABASE_ANON_KEY | Auto | Provided by Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Auto | Provided by Supabase |
| ELEVENLABS_API_KEY | Yes | ElevenLabs API key |
| TWILIO_ACCOUNT_SID | Yes | Twilio account SID |
| TWILIO_AUTH_TOKEN | Yes | Twilio auth token |
| TWILIO_PHONE_NUMBER | Yes | Twilio phone number (E.164) |
| DEEPGRAM_API_KEY | Yes | Deepgram API key (speech-to-text) |
| ANTHROPIC_API_KEY | Yes | Anthropic API key (voice-to-form parsing) |
| CRON_SECRET | Yes | Shared secret for cron job auth |

---

## Production Checklist

### Security

- [ ] RLS enabled on all tables
- [ ] API keys are production keys
- [ ] Secrets not in version control
- [ ] HTTPS enforced
- [ ] JWT auth on all user-facing edge functions
- [ ] CRON_SECRET set for check-reminders

### Performance

- [ ] Database indexes created
- [ ] CDN configured (optional)
- [ ] Caching headers set

### Monitoring

- [ ] Error tracking (Sentry, etc.)
- [ ] Supabase logs enabled
- [ ] Twilio call logs reviewed
- [ ] Usage alerts configured

### Testing

- [ ] Test call delivery
- [ ] Test voice input (speech-to-text)
- [ ] Test recurring reminders
- [ ] Test across regions

### Legal

- [ ] Privacy policy
- [ ] Terms of service
- [ ] TCPA compliance (US)
- [ ] GDPR compliance (EU)

---

## Scaling Considerations

### Database

- Monitor connection usage
- Consider Supabase Pro for more connections
- Add read replicas if needed

### Edge Functions

- Monitor execution times
- Consider Pro plan for higher limits
- Optimize ElevenLabs calls (caching, batching)

### External Services

- **Twilio**: Monitor concurrent calls
- **ElevenLabs**: Watch character usage
- **Deepgram**: Monitor transcription hours
- **Anthropic**: Monitor token usage

---

## Rollback Procedure

If deployment fails:

1. **Vercel/Netlify**: Redeploy previous commit via dashboard
2. **Edge Functions**: `supabase functions deploy --version <previous>`
3. **Database**: Apply reverse migration or restore backup

---

## Support

For deployment issues:
- Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- Open GitHub issue
- Contact Supabase/Twilio support for service issues
