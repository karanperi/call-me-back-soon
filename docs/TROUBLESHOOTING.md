# Troubleshooting Guide

Common issues and their solutions when developing or using Yaad.

## Development Issues

### "Missing Supabase URL or Key"

**Symptom**: App shows error about missing Supabase configuration.

**Solutions**:
1. Ensure `.env` file exists in project root
2. Verify variables are prefixed with `VITE_`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key
   ```
3. Restart dev server after changing `.env`
4. Check for typos in variable names

---

### "Cannot find module '@/...'" 

**Symptom**: TypeScript/build errors about missing modules.

**Solutions**:
1. Verify `tsconfig.json` has path aliases:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```
2. Restart TypeScript server in IDE
3. Run `npm install` to ensure dependencies

---

### "Port 5173 already in use"

**Symptom**: Dev server fails to start.

**Solutions**:
```bash
# Find process using port
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- --port 3000
```

---

## Authentication Issues

### "Invalid login credentials"

**Symptom**: Cannot log in despite correct credentials.

**Solutions**:
1. Verify email is confirmed (check email inbox)
2. Check Supabase Auth settings:
   - Enable email provider
   - Disable email confirmation (for dev)
3. Reset password via app

---

### "Session expired" repeatedly

**Symptom**: Gets logged out frequently.

**Solutions**:
1. Check browser storage isn't being cleared
2. Verify Supabase JWT expiry settings
3. Check for multiple tabs interfering

---

## Edge Function Issues

### "Edge function returns 500"

**Symptom**: API calls fail with server error.

**Solutions**:
1. Check secrets are set:
   ```bash
   supabase secrets list
   ```
2. View function logs:
   ```bash
   supabase functions logs make-call
   ```
3. Verify all required secrets exist:
   - ELEVENLABS_API_KEY
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_PHONE_NUMBER

---

### "Function not found"

**Symptom**: 404 when calling edge function.

**Solutions**:
1. Deploy function:
   ```bash
   supabase functions deploy make-call
   ```
2. Verify function URL matches project
3. Check function name matches exactly

---

### "CORS error"

**Symptom**: Browser blocks API request.

**Solutions**:
1. Ensure function handles OPTIONS requests:
   ```typescript
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
   ```
2. Verify CORS headers are returned:
   ```typescript
   const corsHeaders = {
     "Access-Control-Allow-Origin": "*",
     "Access-Control-Allow-Headers": "authorization, content-type",
   };
   ```

---

## Call Delivery Issues

### "Call not going through"

**Symptom**: Call initiated but recipient doesn't receive it.

**Solutions**:
1. Verify phone number format (E.164: +1234567890)
2. Check Twilio console for call logs
3. Verify Twilio account has balance
4. Check geographic permissions in Twilio
5. Ensure phone number has Voice capability

---

### "Call status stuck on 'pending'"

**Symptom**: Call history shows pending but never updates.

**Solutions**:
1. Check `twilio-status-callback` function is deployed
2. Verify callback URL is correct in `make-call`:
   ```typescript
   const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;
   ```
3. Check Twilio webhook logs

---

### "Audio not playing in call"

**Symptom**: Recipient answers but hears nothing.

**Solutions**:
1. Verify ElevenLabs API key is valid
2. Check audio was uploaded to Storage
3. Verify signed URL is being generated
4. Check Storage bucket permissions
5. Test audio URL directly in browser

---

## Voice Cloning Issues

### "Voice cloning failed"

**Symptom**: Cannot create custom voice.

**Solutions**:
1. Ensure recording is at least 10 seconds
2. Check audio format (WebM supported)
3. Verify ElevenLabs account has instant voice clone access
4. Check API character limits

---

### "Custom voice sounds wrong"

**Symptom**: Cloned voice doesn't match original.

**Solutions**:
1. Record in quiet environment
2. Speak clearly and naturally
3. Record longer sample (30+ seconds)
4. Delete and recreate voice

---

## Database Issues

### "Permission denied for table"

**Symptom**: RLS blocking queries.

**Solutions**:
1. Verify RLS policies exist for the operation
2. Check user is authenticated
3. Verify user_id matches auth.uid()
4. For edge functions, use service role key

---

### "Foreign key violation"

**Symptom**: Insert/update fails.

**Solutions**:
1. Verify referenced record exists
2. Check constraint definitions
3. Ensure proper order of operations

---

## Performance Issues

### "App loads slowly"

**Symptom**: Initial page load is slow.

**Solutions**:
1. Check network tab for slow requests
2. Verify Supabase region matches user location
3. Review bundle size:
   ```bash
   npm run build
   # Check dist/ sizes
   ```
4. Enable code splitting for routes

---

### "ElevenLabs rate limited"

**Symptom**: Voice generation fails with 429 error.

**Solutions**:
1. Implement request queuing
2. Cache generated audio
3. Upgrade ElevenLabs plan
4. Add retry with exponential backoff

---

## Mobile Issues

### "Can't record voice on mobile"

**Symptom**: Microphone access denied.

**Solutions**:
1. Ensure HTTPS (required for mic access)
2. Check browser permissions
3. Test in different browser
4. iOS: Use Safari (Chrome has limitations)

---

### "Layout broken on mobile"

**Symptom**: UI elements misaligned.

**Solutions**:
1. Check responsive breakpoints
2. Test with device emulator
3. Verify Tailwind mobile classes
4. Check for fixed widths

---

## Getting Help

If your issue isn't listed:

1. **Check logs**:
   - Browser console
   - Network tab
   - Supabase logs
   - Twilio logs

2. **Search existing issues**:
   - [GitHub Issues](https://github.com/karanperi/call-me-back-soon/issues)

3. **Open new issue** with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details
   - Relevant logs

4. **External service issues**:
   - [Supabase Status](https://status.supabase.com)
   - [Twilio Status](https://status.twilio.com)
   - [ElevenLabs Status](https://status.elevenlabs.io)
