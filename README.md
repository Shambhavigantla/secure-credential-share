# Secure Credential Sharing Platform

A production-grade platform for issuing, managing, and selectively disclosing digital credentials with cryptographic verification.

## 🎯 Key Features

### ✅ Core Features Implemented
- **User Authentication**: JWT-based registration and login with secure password hashing
- **Credential Issuance**: Issue credentials with multiple claims (field-value pairs)
- **Selective Disclosure**: Choose exactly which fields to share with verifiers
- **Cryptographic Verification**: EdDSA signatures + Merkle tree-based proof system
- **Verifiable Presentations**: Create time-limited, shareable credential proofs
- **Public Verification**: Verify credentials without authentication
- **QR Code Generation**: Share credentials via QR codes
- **Rate Limiting**: Protect verification endpoint from abuse
- **Input Validation & Sanitization**: Prevent injection attacks
- **Mobile-First UI**: Responsive design for all devices

### 🔐 Security Features
- EdDSA digital signatures for credential issuer authentication
- SHA256-based Merkle tree for commitment verification
- Salted hashes to prevent rainbow table attacks
- JWT tokens with expiration
- HTTP-only secure cookies
- Input validation with Zod schemas
- Rate limiting on sensitive endpoints
- Never expose full credentials unnecessarily

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose
- **Cryptography**: @noble/hashes, @noble/ed25519
- **Utilities**: jsonwebtoken, bcryptjs, qrcode, uuid, axios

### Project Structure
```
secure-credential-share/
│   ├── app/
│   │   ├── api/                          # Backend API routes
│   │   │   ├── auth/
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   └── credentials/
│   │   │       ├── route.ts              # GET /api/credentials (list user's creds)
│   │   │       ├── [id]/route.ts         # GET /api/credentials/:id
│   │   │       ├── issue/route.ts        # POST /api/credentials/issue
│   │   │       ├── share/route.ts        # POST /api/credentials/share (create disclosure)
│   │   │       └── verify/route.ts       # POST /api/credentials/verify (public)
│   │   ├── login/page.tsx                # Login page
│   │   ├── register/page.tsx             # Registration page
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  # Dashboard (list credentials)
│   │   │   ├── issue/page.tsx            # Issue new credential
│   │   │   └── share/[id]/page.tsx       # Selective disclosure UI
│   │   └── verify/page.tsx               # Public verification page
│   ├── lib/
│   │   ├── db.ts                         # MongoDB connection
│   │   ├── middleware.ts                 # JWT auth & rate limiting
│   │   ├── validation.ts                 # Zod schemas & input sanitization
│   │   ├── selective-disclosure.ts       # Core cryptographic logic ⭐
│   │   ├── merkle.ts                     # Merkle tree operations
│   │   └── crypto/                       # Cryptographic utilities
│   │       ├── merkle.ts
│   │       └── signing.ts
│   └── models/
│       ├── User.ts                       # User schema
│       └── Credential.ts                 # Credential schema
├── .env.local.example                    # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone & Install Dependencies
```bash
cd secure-credential-share
npm install
```

### 2. Environment Setup
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/secure-credential-share
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRY=7d
ISSUER_NAME=Your Organization
NODE_ENV=development
```

### 3. Generate Issuer Keypair (Optional)
For demo purposes, signing uses a mock key. For production, generate real keypairs:

```bash
node -e "
const ed = require('@noble/ed25519');
(async () => {
  const privKey = ed.utils.randomSecretKey();
  const pubKey = await ed.getPublicKeyAsync(privKey);
  console.log('ISSUER_PRIVATE_KEY=' + Buffer.from(privKey).toString('hex'));
  console.log('ISSUER_PUBLIC_KEY=' + Buffer.from(pubKey).toString('hex'));
})();
"
```

### 4. Start MongoDB
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (update MONGODB_URI in .env.local)
```

### 5. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## 📚 API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "jwt_token_here"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

---

### Credential Endpoints

#### Issue New Credential
```http
POST /api/credentials/issue
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Bachelor of Science",
  "issuerName": "University of Technology",
  "expiresInDays": 365,
  "claims": {
    "name": "John Doe",
    "degree": "BS Computer Science",
    "graduationYear": "2023",
    "cgpa": "3.8",
    "marks": "94"
  }
}
```

**Response:**
```json
{
  "success": true,
  "credential": {
    "id": "credential_id",
    "title": "Bachelor of Science",
    "merkleRoot": "hash_value",
    "issuedAt": "2026-05-30T10:00:00Z",
    "issuerName": "University of Technology"
  }
}
```

#### List User's Credentials
```http
GET /api/credentials
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "credentials": [
    {
      "id": "cred_1",
      "title": "Bachelor of Science",
      "merkleRoot": "...",
      "issuedAt": "2026-05-30T10:00:00Z",
      "issuerName": "University of Technology",
      "shareCount": 2
    }
  ]
}
```

#### Get Single Credential
```http
GET /api/credentials/{id}
Authorization: Bearer {token}
```

---

### Selective Disclosure Endpoints

#### Create Shareable Presentation ⭐
```http
POST /api/credentials/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "credentialId": "credential_id",
  "selectedFields": ["name", "degree", "graduationYear"],
  "expiresInMinutes": 1440
}
```

**Response:**
```json
{
  "success": true,
  "shareToken": "share_token_uuid",
  "verifiableLink": "http://localhost:3000/verify?token=share_token_uuid",
  "qrCode": "data:image/png;base64,...",
  "expiresAt": "2026-05-31T10:00:00Z",
  "presentation": {
    "credentialId": "...",
    "presentationToken": "...",
    "disclosedFields": [
      {
        "field": "name",
        "value": "John Doe",
        "salt": "random_hex",
        "hash": "sha256_hash"
      }
    ],
    "merkleRoot": "...",
    "issuerSignature": "..."
  }
}
```

#### Verify Shared Credential (Public - No Auth Required)
```http
POST /api/credentials/verify
Content-Type: application/json

{
  "shareToken": "share_token_uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "credentialId": "credential_id",
  "credentialTitle": "Bachelor of Science",
  "disclosedData": {
    "name": "John Doe",
    "degree": "BS Computer Science",
    "graduationYear": "2023"
  },
  "issuerName": "University of Technology",
  "issuedAt": "2026-05-30T10:00:00Z",
  "verifiedAt": "2026-05-30T10:30:00Z",
  "trustScore": 100,
  "viewCount": 5
}
```

---

## 🔐 How Selective Disclosure Works

### 1. Credential Issuance
When a credential is issued:
- All claims are stored in the database
- For each claim, a cryptographic commitment is created:
  ```
  commitment = SHA256(field_name + ":" + field_value + ":" + random_salt)
  ```
- All commitments are organized into a **Merkle tree**
- The **Merkle root** is calculated and cryptographically signed by the issuer

### 2. Selective Sharing
When sharing specific fields:
- User selects which fields to disclose (e.g., name, degree but NOT cgpa, marks)
- A **Verifiable Presentation** is created containing:
  - Only the selected field commitments
  - The original Merkle root
  - The issuer's signature
  - A unique presentation token
- A time-limited, shareable link is generated

### 3. Verification
When a verifier checks the shared credential:
- The verifier receives the disclosed fields with their commitments
- The system verifies that:
  - Each disclosed commitment matches the original (field:value:salt hash)
  - All commitments together produce the original Merkle root
  - The Merkle root signature matches the issuer's public key
- Trust score is calculated based on verification success
- Verifier sees ONLY the disclosed fields, never the full credential

### Cryptographic Guarantees
✓ **Authenticity**: Issuer's EdDSA signature proves issuance  
✓ **Integrity**: Merkle tree proves no data tampering  
✓ **Selective Disclosure**: Unrevealed fields cannot be inferred  
✓ **Privacy**: Verifier never sees full credential  
✓ **Proof of Possession**: Holder must provide correct salts  

---

## 📦 Deployment

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t secure-credentials .
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb://mongo:27017/secure-credential-share" \
  -e JWT_SECRET="your_secret_key" \
  secure-credentials
```

### Deployment Checklist
- [ ] Set `NODE_ENV=production` in environment
- [ ] Use strong, random `JWT_SECRET` (min 32 chars)
- [ ] Configure MongoDB Atlas for production
- [ ] Enable HTTPS/TLS
- [ ] Set up proper error logging and monitoring
- [ ] Configure CORS if frontend is separate
- [ ] Set up automated backups for MongoDB
- [ ] Enable rate limiting on all public endpoints
- [ ] Use environment variables for all secrets

---

## 🧪 Testing the System

### Test Flow
1. **Register**: Create two accounts (Holder and Verifier)
2. **Issue**: Holder issues a credential with multiple fields
3. **Share**: Holder selectively shares some fields only
4. **Verify**: Verifier checks the shared credential without login

### Test Scenarios
```bash
# Test 1: Issue credential with 5 fields
POST /api/credentials/issue
{
  "title": "University Certificate",
  "claims": {
    "name": "Alice Smith",
    "degree": "BS Computer Science",
    "graduationYear": "2023",
    "cgpa": "3.9",
    "honors": "Summa Cum Laude"
  }
}

# Test 2: Share only name, degree, graduationYear
POST /api/credentials/share
{
  "credentialId": "...",
  "selectedFields": ["name", "degree", "graduationYear"]
}

# Test 3: Verify (no auth needed)
POST /api/credentials/verify
{
  "shareToken": "..."
}
# Returns: name, degree, graduationYear ✓
# Missing: cgpa, honors ✓
# Verified: ✓
```

---

## 🎨 Frontend Features

### Holder Dashboard
- View all issued credentials
- Issue new credentials with dynamic fields
- Selective field disclosure interface
- Generate shareable links with QR codes
- View share history and analytics

### Verifier Page
- Public verification (no login required)
- Beautiful credential display
- Trust score visualization
- Field-level verification indicators
- Issuer and timestamp validation

---

## 📈 Bonus Features Implemented

✅ Real EdDSA cryptography (via @noble/ed25519)  
✅ Merkle tree-based verification  
✅ Time-limited share links  
✅ QR code generation  
✅ Rate limiting (50 req/min on verify)  
✅ Input validation & sanitization  
✅ Mobile-first responsive design  
✅ Field-level trust indicators  
✅ View count tracking  
✅ Expiry date handling  

---

## 🔧 Troubleshooting

### MongoDB Connection Error
```bash
# Check MongoDB is running
mongosh  # or mongo

# Or update MONGODB_URI to use Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

### Token Validation Errors
```bash
# Ensure JWT_SECRET is set and consistent
# Delete browser cookies and login again
```

### Verification Fails
- Check share token hasn't expired
- Verify issuer public key is configured
- Check Merkle tree wasn't corrupted

---

## 📝 Notes

### Security Considerations
1. **Never** transmit full credentials over public channels
2. **Always** use HTTPS in production
3. **Always** validate and sanitize user input
4. **Regularly** rotate JWT secrets
5. **Monitor** rate limiting for abuse patterns
6. **Audit** all credential issuance events

### Performance Optimization
- Use Redis for session management at scale
- Implement credential caching with TTL
- Use CDN for QR code and static assets
- Batch verify operations with pagination

### Future Enhancements
- Revocation mechanism for issued credentials
- Multiple issuer support
- Batch credential issuance
- Offline verification (with cached root)
- OIDC/OAuth2 integration
- Biometric authentication for holders

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👨‍💻 Support

For issues, questions, or contributions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Enable debug logs: `DEBUG=*`

---

**Built with ❤️ for secure credential sharing**
