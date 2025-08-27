#!/bin/bash -e

# 创建支持多域名和IP的自签证书
# 支持参数化配置域名和IP地址

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain=*)
            DOMAIN="${1#*=}"
            shift
            ;;
        --cert-name=*)
            CERT_NAME="${1#*=}"
            shift
            ;;
        --ca-name=*)
            CA_NAME="${1#*=}"
            shift
            ;;
        --ca-org=*)
            CA_ORG="${1#*=}"
            shift
            ;;
        --ca-unit=*)
            CA_UNIT="${1#*=}"
            shift
            ;;
        --wildcard-domain=*)
            WILDCARD_DOMAIN="${1#*=}"
            WILDCARD="*.${WILDCARD_DOMAIN}"
            shift
            ;;
        --ips=*)
            IPS="${1#*=}"
            shift
            ;;
        --ssl-size=*)
            SSL_SIZE="${1#*=}"
            shift
            ;;
        --ssl-date=*)
            SSL_DATE="${1#*=}"
            shift
            ;;
        --country=*)
            CN="${1#*=}"
            shift
            ;;
        --output-dir=*)
            OUTPUT_DIR="${1#*=}"
            shift
            ;;
        *)
            echo "未知参数: $1"
            exit 1
            ;;
    esac
done

# 默认配置参数
SSL_SIZE=${SSL_SIZE:-2048}
SSL_DATE=${SSL_DATE:-365}
CA_DATE=${CA_DATE:-365}
CN=${CN:-CN}
DOMAIN=${DOMAIN:-"localhost"}
CERT_NAME=${CERT_NAME:-"${DOMAIN}"}
CA_NAME=${CA_NAME:-"ACENova CA"}
CA_ORG=${CA_ORG:-"ACENova"}
CA_UNIT=${CA_UNIT:-"ACENova Department"}
IPS=${IPS:-"127.0.0.1"}
WILDCARD_DOMAIN=${WILDCARD_DOMAIN:-""}
WILDCARD=${WILDCARD:-""}
OUTPUT_DIR=${OUTPUT_DIR:-"output"}

# 如果output目录存在且不为空，则清理
if [[ -d "${OUTPUT_DIR}" ]]; then
    rm -rf "${OUTPUT_DIR}"/*
fi

# 创建输出目录
mkdir -p "${OUTPUT_DIR}"

# 文件名
CA_KEY="${OUTPUT_DIR}/ca-key.pem"
CA_CERT="${OUTPUT_DIR}/ca-cert.pem"
SSL_KEY="${OUTPUT_DIR}/server-key.pem"
SSL_CSR="${OUTPUT_DIR}/server.csr"
SSL_CERT="${OUTPUT_DIR}/server-cert.pem"
SSL_CONFIG="${OUTPUT_DIR}/openssl.cnf"

echo "生成CA私钥..."
openssl genrsa -out ${CA_KEY} ${SSL_SIZE}

echo "生成CA证书..."
openssl req -x509 -sha256 -new -nodes -key ${CA_KEY} -days ${CA_DATE} -out ${CA_CERT} \
    -subj "/C=${CN}/ST=Beijing/L=Beijing/O=${CA_ORG}/OU=${CA_UNIT}/CN=${CA_NAME}"

echo "创建OpenSSL配置文件..."
cat > ${SSL_CONFIG} <<EOF
[req]
default_bits = ${SSL_SIZE}
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=${CN}
ST=Beijing
L=Beijing
O=${CA_ORG}
OU=${CA_UNIT}
CN=${CERT_NAME}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
EOF

# 添加DNS条目
dns_count=1
echo "DNS.${dns_count} = localhost" >> ${SSL_CONFIG}
dns_count=$((dns_count + 1))

if [[ -n "${DOMAIN}" && "${DOMAIN}" != "localhost" ]]; then
    echo "DNS.${dns_count} = ${DOMAIN}" >> ${SSL_CONFIG}
    dns_count=$((dns_count + 1))
fi

# 添加泛域名（如果指定）
if [[ -n ${WILDCARD} ]]; then
    echo "DNS.${dns_count} = ${WILDCARD}" >> ${SSL_CONFIG}
    dns_count=$((dns_count + 1))
fi

# 添加IP地址
ip_count=1
echo "IP.${ip_count} = 127.0.0.1" >> ${SSL_CONFIG}
ip_count=$((ip_count + 1))

# 添加用户指定的IP地址
if [[ -n ${IPS} ]]; then
    IFS=',' read -ra IP_ARRAY <<< "${IPS}"
    for ip in "${IP_ARRAY[@]}"; do
        ip=$(echo "$ip" | xargs)
        if [[ -n "$ip" && "$ip" != "127.0.0.1" ]]; then
            echo "IP.${ip_count} = ${ip}" >> ${SSL_CONFIG}
            ip_count=$((ip_count + 1))
        fi
    done
fi

echo "生成服务器私钥..."
openssl genrsa -out ${SSL_KEY} ${SSL_SIZE}

echo "生成证书签名请求(CSR)..."
openssl req -new -key ${SSL_KEY} -out ${SSL_CSR} -config ${SSL_CONFIG}

echo "使用CA签名生成服务器证书..."
openssl x509 -req -in ${SSL_CSR} -CA ${CA_CERT} -CAkey ${CA_KEY} \
    -CAcreateserial -out ${SSL_CERT} -days ${SSL_DATE} \
    -extensions v3_req -extfile ${SSL_CONFIG}

echo "创建完整证书链..."
cat ${SSL_CERT} ${CA_CERT} > ${OUTPUT_DIR}/fullchain.pem

echo "证书生成完成!"
echo "生成的文件:"
echo "- CA证书: ${CA_CERT}"
echo "- CA私钥: ${CA_KEY}"
echo "- 服务器证书: ${SSL_CERT}"
echo "- 服务器私钥: ${SSL_KEY}"
echo "- 完整证书链: ${OUTPUT_DIR}/fullchain.pem"