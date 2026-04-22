import json
import os
import re
import secrets
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

import boto3

"""
Adapted from previous work with AWS S3 buckets

Requirments for this to work are:
- S3 bucket 
- IAM user with write access to your bucket 
- IAM user credentials
"""

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def get_env(name):
    return (os.getenv(name) or "").strip()


def json_response(handler, status_code, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def get_s3_client():
    region = get_env("AWS_REGION")
    access_key_id = get_env("AWS_ACCESS_KEY_ID")
    secret_access_key = get_env("AWS_SECRET_ACCESS_KEY")

    if not region or not access_key_id or not secret_access_key:
        raise ValueError("Missing AWS credentials.")

    return boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
    )


def build_object_key():
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    return f"{timestamp}-{secrets.token_hex(4)}.json"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        bucket = get_env("AWS_S3_BUCKET")
        if not bucket:
            return json_response(self, 500, {"ok": False, "error": "Bucket is not configured."})

        content_length = int(self.headers.get("Content-Length", "0") or "0")
        raw_body = self.rfile.read(content_length) if content_length > 0 else b""

        try:
            payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except Exception:
            return json_response(self, 400, {"ok": False, "error": "Invalid request body."})

        email = (payload.get("email") or "").strip().lower()
        if not email or not EMAIL_REGEX.match(email):
            return json_response(self, 400, {"ok": False, "error": "Please enter a valid email."})

        submitted_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        record = {
            "email": email,
            "submittedAt": submitted_at,
        }

        object_key = build_object_key()

        try:
            get_s3_client().put_object(
                Bucket=bucket,
                Key=object_key,
                Body=json.dumps(record, ensure_ascii=False),
                ContentType="application/json",
                ServerSideEncryption="AES256",
            )
        except Exception as error:
            print(f"S3 write failed: {error}; key={object_key}")
            return json_response(
                self, 500, {"ok": False, "error": "Unable to save your email right now."}
            )

        return json_response(self, 200, {"ok": True, "key": object_key})

    def do_GET(self):
        return json_response(self, 405, {"ok": False, "error": "Method not allowed."})

    def do_OPTIONS(self):
        return json_response(self, 204, {})
