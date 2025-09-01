# 🔐 Google OAuth Setup for Quirk-Payments

This guide explains how to set up Google OAuth authentication for the Quirk-Payments web application.

## 📋 **Prerequisites**

- Google Cloud Console account
- Node.js and npm installed
- Next.js project setup

## 🚀 **Step-by-Step Setup**

### **1. Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API

### **2. Configure OAuth Consent Screen**

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required information:
   - App name: `Quirk-Payments`
   - User support email: `your-email@domain.com`
   - Developer contact information: `your-email@domain.com`

### **3. Create OAuth 2.0 Credentials**

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### **4. Get Your Credentials**

After creation, you'll receive:
- **Client ID**: `YOUR_GOOGLE_CLIENT_ID_HERE`
- **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET_HERE`

### **5. Configure Environment Variables**

Create a `.env.local` file in your project root:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET_HERE
```

### **6. Install Dependencies**

```bash
npm install next-auth @auth/core @auth/nextjs
```

### **7. Configure NextAuth.js**

Create `pages/api/auth/[...nextauth].js` or `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Add your custom configuration here
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### **8. Test Authentication**

1. Start your development server: `npm run dev`
2. Navigate to `/api/auth/signin`
3. Test Google OAuth flow

## 🔒 **Security Best Practices**

- **Never commit** `.env` files to version control
- **Use strong secrets** for NEXTAUTH_SECRET
- **Restrict redirect URIs** to your domains only
- **Enable 2FA** on your Google account
- **Regularly rotate** client secrets

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Invalid redirect_uri" error**
   - Check that your redirect URI matches exactly
   - Include protocol (http/https)
   - Verify port numbers

2. **"Client ID not found" error**
   - Verify your environment variables are loaded
   - Check for typos in client ID
   - Ensure the project is enabled

3. **"Access blocked" error**
   - Check OAuth consent screen configuration
   - Verify API is enabled
   - Check for any domain restrictions

### **Debug Mode**

Enable debug logging in NextAuth:

```typescript
export const authOptions = {
  debug: true,
  // ... other options
};
```

## 📚 **Additional Resources**

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

## 🆘 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Review NextAuth.js documentation
3. Check Google Cloud Console logs
4. Open an issue in the Quirk-Payments repository

---

**Remember: Keep your credentials secure and never share them publicly!**
