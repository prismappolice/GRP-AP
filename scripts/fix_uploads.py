import os, zipfile, shutil

APP = '/home/prismappolice/GRP-AP/backend'
GALLERY = os.path.join(APP, 'gallery_uploads')
NEWS = os.path.join(APP, 'news_uploads')
IMG_EXTS = ('.jpeg', '.jpg', '.png', '.gif', '.webp', '.avif', '.mp4', '.webm')

# Move misplaced gallery images from backend/ root to gallery_uploads/
moved = 0
for f in os.listdir(APP):
    if f.lower().endswith(IMG_EXTS):
        src = os.path.join(APP, f)
        dst = os.path.join(GALLERY, f)
        shutil.move(src, dst)
        moved += 1
        print(f"  Moved {f} -> gallery_uploads/")
print(f"Gallery: moved {moved} files to gallery_uploads/")
print(f"Gallery total: {len(os.listdir(GALLERY))} files")

# Extract news_uploads.zip
NEWS_ZIP = '/home/prismappolice/news_uploads.zip'
if os.path.exists(NEWS_ZIP):
    with zipfile.ZipFile(NEWS_ZIP) as zf:
        for member in zf.namelist():
            fname = os.path.basename(member)
            if fname:
                dest = os.path.join(NEWS, fname)
                with zf.open(member) as src_f, open(dest, 'wb') as dst_f:
                    shutil.copyfileobj(src_f, dst_f)
                print(f"  Extracted news: {fname}")
    os.remove(NEWS_ZIP)
    print(f"News total: {len(os.listdir(NEWS))} files")
else:
    print("No news_uploads.zip found")
