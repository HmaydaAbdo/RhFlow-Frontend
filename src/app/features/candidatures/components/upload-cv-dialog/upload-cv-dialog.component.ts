import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { NgClass } from '@angular/common';

import { CandidatureService } from '../../services/candidature.service';
import { NotificationService } from '../../../../core/services/NotificationService';
import { CandidatureResponse } from '../../models/candidature.models';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_MB  = 10;
const MAX_SIZE_B   = MAX_SIZE_MB * 1024 * 1024;

type UploadState = 'idle' | 'selected' | 'uploading' | 'done' | 'error';

@Component({
  selector: 'app-upload-cv-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule, NgClass],
  templateUrl: './upload-cv-dialog.component.html',
})
export class UploadCvDialogComponent implements OnInit {

  @Input({ required: true }) projetId!: number;
  @Input()                   visible   = false;
  @Output()                  visibleChange = new EventEmitter<boolean>();
  /** Émis une fois que la candidature est EVALUE ou ERREUR (pipeline terminé). */
  @Output()                  uploadDone    = new EventEmitter<void>();

  private readonly service      = inject(CandidatureService);
  private readonly notification = inject(NotificationService);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  // ── State ────────────────────────────────────────────────────────────────
  state: UploadState = 'idle';
  selectedFile: File | null = null;
  errorMessage  = '';
  dragging      = false;

  // ── Validation ────────────────────────────────────────────────────────────
  get accept(): string { return '.pdf,.docx'; }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.reset());
  }

  // ── Visibility ────────────────────────────────────────────────────────────
  onHide(): void {
    this.reset();
    this.visibleChange.emit(false);
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
    this.cdr.markForCheck();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (file) this.handleFile(file);
    input.value = ''; // reset input so same file can be re-selected
  }

  // ── File handling ─────────────────────────────────────────────────────────
  private handleFile(file: File): void {
    const typeOk = ACCEPTED_TYPES.includes(file.type);
    const sizeOk = file.size <= MAX_SIZE_B;

    if (!typeOk) {
      this.setError(`Format non accepté. Utilisez un fichier PDF ou DOCX.`);
      return;
    }
    if (!sizeOk) {
      this.setError(`Fichier trop volumineux. Taille maximum : ${MAX_SIZE_MB} Mo.`);
      return;
    }

    this.selectedFile = file;
    this.state        = 'selected';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  removeFile(): void {
    this.selectedFile = null;
    this.state        = 'idle';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  upload(): void {
    if (!this.selectedFile) return;
    this.state = 'uploading';
    this.cdr.markForCheck();

    this.service.upload(this.projetId, this.selectedFile)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (candidature) => this.onUploadSuccess(candidature),
        error: (err)        => this.onUploadError(err),
      });
  }

  private onUploadSuccess(_candidature: CandidatureResponse): void {
    this.state = 'done';
    this.cdr.markForCheck();
    setTimeout(() => this.close(), 1800);
  }

  private onUploadError(err: unknown): void {
    const msg = (err as { error?: { message?: string } })?.error?.message;
    // Doublon détecté côté backend
    if (msg?.toLowerCase().includes('doublon')) {
      this.setError('Un CV avec cette adresse email existe déjà pour ce projet.');
    } else {
      this.setError('Une erreur est survenue lors de l\'envoi. Veuillez réessayer.');
    }
  }


  // ── Close / Reset ─────────────────────────────────────────────────────────
  close(): void {
    this.visibleChange.emit(false);
    this.uploadDone.emit();
    this.reset();
  }

  private reset(): void {
    this.state        = 'idle';
    this.selectedFile = null;
    this.errorMessage = '';
    this.dragging     = false;
  }

  private setError(msg: string): void {
    this.state        = 'error';
    this.errorMessage = msg;
    this.selectedFile = null;
    this.cdr.markForCheck();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  get fileIcon(): string {
    if (!this.selectedFile) return 'fa fa-file';
    return this.selectedFile.type === 'application/pdf'
      ? 'fa fa-file-pdf'
      : 'fa fa-file-word';
  }
}
