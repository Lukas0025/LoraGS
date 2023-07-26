import os
import base64

www_path = "./www/"
www_files = os.listdir(www_path)
 
print("Found web files: ", www_files)

c_code = "#pragma ones\n/* web file content */\n"

for i in range(len(www_files)):
    with open(www_path + www_files[i]) as f:
        content = "\n".join(f.readlines()).replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
        
        c_code += f"//{www_files[i]}\nconst char* file_{i} = \"{content}\";\n\n"

c_code += "#define ADD_WEB_FILES(server) "

for i in range(len(www_files)):
    
    if (www_files[i] == "index.html"):
        www_files[i] = ""

    c_code += "server.on(\"/" + www_files[i] + "\", HTTP_GET, [](AsyncWebServerRequest *request) { request->send(200, \"text/html\", file_" + str(i) + "); });";

f = open("./include/webSites.h", "w")
f.write(c_code)
f.close()
