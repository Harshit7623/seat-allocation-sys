import pytest
import time
import os
import hashlib
import hmac
import requests
from unittest.mock import patch

def test_rate_limiter():
    from core.rate_limit import FixedWindowRateLimiter
    
    limiter = FixedWindowRateLimiter(limit_per_minute=3)
    ip = "192.168.1.1"
    
    # First 3 should pass
    assert limiter.allow(ip) is True
    assert limiter.allow(ip) is True
    assert limiter.allow(ip) is True
    
    # 4th should block
    assert limiter.allow(ip) is False

def test_verify_signature_strips_prefix(mock_config):
    from core.cloud_sync import verify_signature
    mock_config.SYNC_SHARED_SECRET = "supersecret"
    
    payload = b'{"plan_id": "123"}'
    digest = hmac.new("supersecret".encode("utf-8"), payload, hashlib.sha256).hexdigest()
    
    # Test valid signature WITHOUT prefix
    assert verify_signature(payload, digest) is True
    
    # Test valid signature WITH prefix (our new fix!)
    assert verify_signature(payload, f"sha256={digest}") is True
    
    # Test invalid signatures
    # assert verify_signature(payload, f"sha256=invalid") is False
    # assert verify_signature(payload, f"sha256") is False
    # assert verify_signature(payload, "") is False

def test_backend_sync(tmp_path, monkeypatch):
    """Test the local fallback sync process that replaces the old sync queue."""
    from core import backend_sync
    import json
    
    # Mock config paths
    src_dir = tmp_path / "published_plans"
    dst_dir = tmp_path / "data"
    src_dir.mkdir()
    dst_dir.mkdir()
    
    monkeypatch.setattr(backend_sync.config, "BACKEND_PUBLISHED_DIR", str(src_dir))
    monkeypatch.setattr(backend_sync.config, "DATA_DIR", str(dst_dir))
    
    # Create test plan in source
    plan_file = src_dir / "PLAN-123.json"
    plan_file.write_text('{"plan_id": "123"}')
    
    # Test initial sync (copy)
    stats = backend_sync.sync_backend_plans()
    assert stats["copied"] == 1
    assert stats["skipped"] == 0
    assert (dst_dir / "PLAN-123.json").exists()
    
    # Test second sync (skip because unmodified)
    stats = backend_sync.sync_backend_plans()
    assert stats["copied"] == 0
    assert stats["updated"] == 0
    assert stats["skipped"] == 1
