import { Injectable, signal } from '@angular/core';
import { Camera, EncodingType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

export interface GalleryPhoto {
  filepath: string;
  createdAt: string;
  webviewPath: string;
  orderId?: string;
}

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly storageKey = 'gallery-photos';
  private readonly items = signal<GalleryPhoto[]>([]);
  readonly photos = this.items.asReadonly();

  async load(): Promise<void> {
    const { value } = await Preferences.get({ key: this.storageKey });
    const stored: Omit<GalleryPhoto, 'webviewPath'>[] = value ? JSON.parse(value) : [];
    const loaded = await Promise.all(
      stored.map(async (photo) => ({
        ...photo,
        webviewPath: await this.preview(photo.filepath),
      })),
    );
    this.items.set(loaded);
  }

  async capture(orderId?: string): Promise<void> {
    const photo = await Camera.takePhoto({ quality: 80, encodingType: EncodingType.JPEG });
    let data: string;
    if (Capacitor.isNativePlatform() && photo.uri) {
      const file = await Filesystem.readFile({ path: photo.uri });
      data = await this.base64(file.data);
    } else if (photo.webPath) {
      const response = await fetch(photo.webPath);
      if (!response.ok) throw new Error('No se pudo leer la fotografía.');
      data = await this.base64(await response.blob());
    } else {
      throw new Error('La cámara no devolvió una fotografía.');
    }
    const filepath = `photos/${crypto.randomUUID()}.jpeg`;
    await Filesystem.writeFile({ path: filepath, data, directory: Directory.Data, recursive: true });
    try {
      const entry = {
        filepath,
        createdAt: new Date().toISOString(),
        webviewPath: await this.preview(filepath),
        ...(orderId ? { orderId } : {}),
      };
      const next = [entry, ...this.items()];
      await Preferences.set({
        key: this.storageKey,
        value: JSON.stringify(
          next.map(({ filepath, createdAt, orderId }) => ({ filepath, createdAt, ...(orderId ? { orderId } : {}) })),
        ),
      });
      this.items.set(next);
    } catch (error) {
      await Filesystem.deleteFile({ path: filepath, directory: Directory.Data });
      throw error;
    }
  }

  private async preview(path: string): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
      return Capacitor.convertFileSrc(uri);
    }
    const file = await Filesystem.readFile({ path, directory: Directory.Data });
    return `data:image/jpeg;base64,${await this.base64(file.data)}`;
  }

  private base64(data: string | Blob): Promise<string> {
    if (typeof data === 'string') return Promise.resolve(data);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(data);
    });
  }
}
