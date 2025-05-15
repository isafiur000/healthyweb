import hmac
import hashlib
import sys

secret = bytes(sys.argv[1], 'utf-8')
message = bytes(sys.argv[2], 'utf-8')
hash = hmac.new(secret, message, hashlib.sha512)
print(hash.hexdigest())
