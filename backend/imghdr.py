import os

def what(file, h=None):
    if h is None:
        if isinstance(file, (str, bytes, os.PathLike)):
            try:
                with open(file, 'rb') as f:
                    h = f.read(32)
            except Exception:
                return None
        elif hasattr(file, 'read'):
            try:
                h = file.read(32)
            except Exception:
                return None
        else:
            return None

    # Check headers
    if h.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if h.startswith(b'\xff\xd8\xff'):
        return 'jpeg'
    if h.startswith(b'GIF87a') or h.startswith(b'GIF89a'):
        return 'gif'
    if h.startswith(b'RIFF') and len(h) >= 12 and h[8:12] == b'WEBP':
        return 'webp'
    return None

tests = []
