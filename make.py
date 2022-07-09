import os
import zipfile
import xml.etree.ElementTree as ET

def getver():
    description = ET.parse('install.rdf').getroot()[0]
    for child in description:
        if child.tag.endswith("}version"):
            return child.text
    return ""

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        for file in files:
            fullpath = os.path.join(root, file)
            if fullpath.startswith("./.git") or fullpath.startswith("./make.py")  or fullpath.startswith("./upload.sh") or fullpath.startswith("./build"):
                continue
            ziph.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), os.path.join(path, '.')))

os.makedirs("build", exist_ok=True)
with zipfile.ZipFile('./build/zenotes-v'+getver()+'.xpi', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('./', zipf)