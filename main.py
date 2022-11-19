import http.server
import socketserver
import time

PORT = 8000

handler = http.server.SimpleHTTPRequestHandler
n = 0

while n < 30:
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print("Server started at localhost:" + str(PORT))
            httpd.serve_forever()
        break
    except OSError:
        print("Failed to bind socket [{0}]".format(n))
        n += 1
        time.sleep(1)
