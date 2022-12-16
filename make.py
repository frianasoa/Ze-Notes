import os
import zipfile
import xml.etree.ElementTree as ET

def getver():
    description = ET.parse('install.rdf').getroot()[0]
    for child in description:
        if child.tag.endswith("}version"):
            return child.text
    return ""

def update():
    v = getver()
    link = "https://github.com/frianasoa/Ze-Notes/releases/download/v"+v+"/zenotes-v"+v+".xpi"
    et = ET.parse('zenote-update.rdf')
    root = et.getroot()
    for child in root.iter("{http://www.mozilla.org/2004/em-rdf#}version"):
        child.text = v
    
    for child in root.iter("{http://www.mozilla.org/2004/em-rdf#}updateLink"):
        child.text=link
    
    et.write("zenote-update.rdf", encoding="utf-8", xml_declaration=True)

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        for file in files:
            fullpath = os.path.join(root, file)
            if fullpath.startswith("./.git") or fullpath.startswith("./make.py")  or fullpath.startswith("./upload.sh") or fullpath.startswith("./build") or fullpath.startswith("./docs"):
                continue
            ziph.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), os.path.join(path, '.')))

update()
os.makedirs("build", exist_ok=True)
with zipfile.ZipFile('./build/zenotes-v'+getver()+'.xpi', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('./', zipf)