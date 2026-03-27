"""
Simplified NDVI Server - Direct File Serving
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import mimetypes

class DirectFileServer(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Only log errors, not every request
        if args[1].startswith('4') or args[1].startswith('5'):
            super().log_message(format, *args)
    
    def do_GET(self):
        # Remove query parameters
        path = self.path.split('?')[0]
        
        # API endpoint
        if path == '/api/latest':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                with open('NDVI_Images/latest_analysis.json', 'r') as f:
                    self.wfile.write(f.read().encode())
            except:
                self.wfile.write(b'{"error": "No data"}')
            return
        
        # Remove leading slash
        if path.startswith('/'):
            path = path[1:]
        
        # Default to dashboard.html
        if path == '' or path == '/':
            path = 'dashboard.html'
        
        # Build absolute file path
        file_path = os.path.join(os.getcwd(), path)
        
        # Check if file exists
        if not os.path.isfile(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'File not found')
            print(f"[404] File not found: {file_path}")
            return
        
        # Get MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = 'application/octet-stream'
        
        # Serve the file
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', len(content))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f'Error reading file: {e}'.encode())
            print(f"[500] Error reading file {file_path}: {e}")

def main():
    port = 8000
    server = HTTPServer(('', port), DirectFileServer)
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║           NDVI DASHBOARD SERVER RUNNING                        ║
╚════════════════════════════════════════════════════════════════╝

  Dashboard URL:  http://localhost:{port}/dashboard.html
  
  Press Ctrl+C to stop
  
""")
    
    try:
        import webbrowser
        webbrowser.open(f'http://localhost:{port}/dashboard.html')
    except:
        pass
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped")

if __name__ == '__main__':
    main()
