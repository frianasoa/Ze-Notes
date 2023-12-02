import os
import zipfile
import xml.etree.ElementTree as ET
import json
import hashlib
import shutil

suffix = ""
def getver():
    description = ET.parse('install.rdf').getroot()[0]
    for child in description:
        if child.tag.endswith("}version"):
            return child.text
    return ""

def sha256sum(filename):
    with open(filename, 'rb', buffering=0) as f:
        return "sha256:"+hashlib.file_digest(f, 'sha256').hexdigest()

def update(filename):
    v = getver()
    link = "https://github.com/frianasoa/Ze-Notes/releases/download/v"+v+"/zenotes-v"+v+".xpi"
    et = ET.parse('zenote-update'+suffix+'.rdf')
    root = et.getroot()
    for child in root.iter("{http://www.mozilla.org/2004/em-rdf#}version"):
        child.text = v
    
    for child in root.iter("{http://www.mozilla.org/2004/em-rdf#}updateLink"):
        child.text=link
    
    et.write("zenote-update"+suffix+".rdf", encoding="utf-8", xml_declaration=True)
    update_json(v, link, sha256sum(filename))


def manifest():
    v = getver()
    with open('manifest.json') as f:
        d = json.load(f)
        d["version"] = v
        
    with open('manifest.json', "w") as f:
        json.dump(d, f, indent=4)

def update_json(version, link, hash):
    with open('zenote-update'+suffix+'.json') as f:
        d = json.load(f)
        d["addons"]["zenotes@alefa.net"]["updates"][0]["version"] = version
        d["addons"]["zenotes@alefa.net"]["updates"][0]["update_link"] = link
        d["addons"]["zenotes@alefa.net"]["updates"][0]["update_hash"] = hash
        
    with open('zenote-update'+suffix+'.json', "w") as f:
        json.dump(d, f, indent=2)

def zipdir(path, ziph):
    exclude = ("./.git", "./make.py", "./upload.sh", "./build", "./docs", "./run.cmd", "./run7.cmd", "./zenote-update")

    for root, dirs, files in os.walk(path):
        for file in files:
            fullpath = os.path.join(root, file)
            if fullpath.startswith(exclude):
                continue
            ziph.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), os.path.join(path, '.')))

def install(source):
    dest = "C:/ETOOLS/apps/Zotero_win-x64/distribution/extensions/zenotes@alefa.net.xpi"
    shutil.copy(source, dest)
    
manifest()  
os.makedirs("build", exist_ok=True)
filename = './build/zenotes-v'+getver()+'.xpi'
with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('./', zipf)
update(filename)
install(filename)