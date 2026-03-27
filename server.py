"""
Automated NDVI Analysis Server
Runs NDVI generation pipeline and serves dashboard
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
import sys
import subprocess
import mimetypes
import urllib.parse

class NDVIRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def translate_path(self, path):
        """Translate URL path to local file path."""
        # Decode URL and strip query parameters
        path = path.split('?', 1)[0]
        path = path.split('#', 1)[0]
        path = urllib.parse.unquote(path)
        
        # Remove leading slash
        if path.startswith('/'):
            path = path[1:]
        
        # Build absolute path
        base_path = os.getcwd()
        path = os.path.join(base_path, path)
        return path
    
    def do_GET(self):
        # API endpoint for latest analysis
        if self.path == '/api/latest':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            try:
                with open('NDVI_Images/latest_analysis.json', 'r') as f:
                    data = json.load(f)
                self.wfile.write(json.dumps(data).encode())
            except FileNotFoundError:
                error = {'error': 'No analysis data available. Run generate_ndvi.py first.'}
                self.wfile.write(json.dumps(error).encode())
            return
        
        # Serve files normally
        super().do_GET()

def run_ndvi_generation():
    """Run the NDVI generation script before starting server."""
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║     AUTOMATED NDVI ANALYSIS PIPELINE - INITIALIZING           ║")
    print("╚════════════════════════════════════════════════════════════════╝\n")
    
    print("[1/2] Running NDVI generation pipeline...\n")
    
    try:
        # Run generate_ndvi.py
        result = subprocess.run(
            [sys.executable, 'generate_ndvi.py'],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Print the output from generate_ndvi.py
        print(result.stdout)
        
        if result.returncode == 0:
            print("[SUCCESS] NDVI generation completed successfully!\n")
            return True
        else:
            print("[FAILED] NDVI generation failed!")
            if result.stderr:
                print("Error:", result.stderr)
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error running NDVI generation: {e}")
        if e.stdout:
            print("Output:", e.stdout)
        if e.stderr:
            print("Error:", e.stderr)
        return False
    except FileNotFoundError:
        print("[ERROR] Error: generate_ndvi.py not found!")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return False

def run_server(port=8000):
    print("[2/2] Starting dashboard server...\n")
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, NDVIRequestHandler)
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║           NDVI DASHBOARD SERVER RUNNING                        ║
╚════════════════════════════════════════════════════════════════╝

  [OK] NDVI analysis completed
  [OK] Server started successfully
  
  Dashboard URL:  http://localhost:{port}/dashboard.html
  API Endpoint:   http://localhost:{port}/api/latest
  
  >> Open the dashboard URL in your browser to view results
  
  Press Ctrl+C to stop the server
  
""")
    
    # Try to open browser automatically
    try:
        import webbrowser
        print("Opening dashboard in browser...")
        webbrowser.open(f'http://localhost:{port}/dashboard.html')
    except:
        pass
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n╔════════════════════════════════════════════════════════════════╗")
        print("║                    Server Stopped                              ║")
        print("╚════════════════════════════════════════════════════════════════╝")
        httpd.shutdown()

if __name__ == '__main__':
    # First, run NDVI generation
    success = run_ndvi_generation()
    
    if not success:
        print("\n[WARNING] NDVI generation failed or incomplete.")
        response = input("Do you want to start the server anyway? (y/n): ")
        if response.lower() != 'y':
            print("Exiting...")
            sys.exit(1)
    
    # Then start the server
    run_server()
