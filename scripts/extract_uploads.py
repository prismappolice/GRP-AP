import zipfile, os
z = zipfile.ZipFile('/home/prismappolice/gallery_uploads.zip')
z.extractall('/home/prismappolice/GRP-AP/backend')
z.close()
print("Done extracting gallery_uploads.zip")
print("Files:", os.listdir('/home/prismappolice/GRP-AP/backend/gallery_uploads'))
