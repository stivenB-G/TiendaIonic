import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PhotoService } from './photo.service';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
  capture: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: mocks.get, set: mocks.set } }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: { readFile: mocks.read, writeFile: mocks.write, deleteFile: mocks.remove },
}));
vi.mock('@capacitor/camera', () => ({ EncodingType: { JPEG: 'jpeg' }, Camera: { takePhoto: mocks.capture } }));

describe('PhotoService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('recupera fotos guardadas con una nueva instancia del servicio', async () => {
    mocks.get.mockResolvedValue({
      value: JSON.stringify([{ filepath: 'photos/one.jpeg', createdAt: '2026-11-07T12:00:00Z' }]),
    });
    mocks.read.mockResolvedValue({ data: 'aW1hZ2U=' });
    const service = new PhotoService();
    await service.load();
    expect(service.photos()[0].webviewPath).toBe('data:image/jpeg;base64,aW1hZ2U=');
    expect(mocks.read).toHaveBeenCalledWith({ path: 'photos/one.jpeg', directory: 'DATA' });
  });

  it('no altera la galería cuando se cancela la cámara', async () => {
    mocks.capture.mockRejectedValue(new Error('User cancelled'));
    const service = new PhotoService();
    await expect(service.capture()).rejects.toThrow('User cancelled');
    expect(service.photos()).toEqual([]);
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('revierte el archivo si falla el guardado del listado', async () => {
    mocks.capture.mockResolvedValue({ webPath: 'data:image/jpeg;base64,aW1hZ2U=' });
    mocks.read.mockResolvedValue({ data: 'aW1hZ2U=' });
    mocks.set.mockRejectedValue(new Error('Storage full'));
    const service = new PhotoService();
    await expect(service.capture()).rejects.toThrow('Storage full');
    expect(mocks.remove).toHaveBeenCalled();
    expect(service.photos()).toEqual([]);
  });

  it('guarda el archivo y recupera su listado al reabrir', async () => {
    mocks.capture.mockResolvedValue({ webPath: 'data:image/jpeg;base64,aW1hZ2U=' });
    mocks.read.mockResolvedValue({ data: 'aW1hZ2U=' });
    const service = new PhotoService();
    await service.capture();
    expect(mocks.write).toHaveBeenCalled();
    const saved = mocks.set.mock.calls[0][0];
    expect(JSON.parse(saved.value)[0]).not.toHaveProperty('webviewPath');
    mocks.get.mockResolvedValue({ value: saved.value });
    const reopened = new PhotoService();
    await reopened.load();
    expect(reopened.photos()).toEqual(service.photos());
  });
});
