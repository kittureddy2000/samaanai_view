#!/bin/bash

# Generate SSL certificates for local HTTPS development
# This script creates self-signed certificates for localhost

set -e

# Create ssl directory if it doesn't exist
mkdir -p ssl

echo "🔐 Generating SSL certificates for local HTTPS development..."

# Generate private key
openssl genrsa -out ssl/localhost.key 2048

# Generate certificate signing request
openssl req -new -key ssl/localhost.key -out ssl/localhost.csr -subj "/C=US/ST=Local/L=Local/O=Samaanai Dev/OU=Development/CN=localhost"

# Create config file for certificate with SAN (Subject Alternative Names)
cat > ssl/localhost.conf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=Local
L=Local
O=Samaanai Development
OU=Development
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate self-signed certificate
openssl x509 -req -in ssl/localhost.csr -signkey ssl/localhost.key -out ssl/localhost.crt -days 365 -extensions v3_req -extfile ssl/localhost.conf

# Set appropriate permissions
chmod 600 ssl/localhost.key
chmod 644 ssl/localhost.crt

# Clean up temporary files
rm ssl/localhost.csr ssl/localhost.conf

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificates location:"
echo "   - Certificate: ssl/localhost.crt"
echo "   - Private Key: ssl/localhost.key"
echo ""
echo "⚠️  IMPORTANT: These are self-signed certificates for development only."
echo "   Your browser will show a security warning. You'll need to:"
echo "   1. Click 'Advanced' or 'Show Details'"
echo "   2. Click 'Proceed to localhost (unsafe)' or similar"
echo "   3. Alternatively, add the certificate to your system's trusted store"
echo ""
echo "🚀 Ready to start HTTPS development!"
echo "   Run: docker-compose -f docker-compose.yml -f docker-compose.https.yml up" 