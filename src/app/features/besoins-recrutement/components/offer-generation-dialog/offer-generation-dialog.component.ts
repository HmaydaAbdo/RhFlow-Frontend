import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule }       from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription }       from 'rxjs';
import { marked }             from 'marked';
import { ButtonModule }       from 'primeng/button';
import { DialogModule }       from 'primeng/dialog';
import { AiOfferService }     from '../../services/ai-offer.service';
import { NotificationService } from '../../../../core/services/NotificationService';

@Component({
  selector: 'app-offer-generation-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, DialogModule],
  templateUrl: './offer-generation-dialog.component.html',
  styles: [`
    .offer-markdown {
      line-height: 1.75;
      font-size: 0.9rem;
      max-height: 65vh;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      background: var(--surface-ground);
      border-radius: 6px;
      border: 1px solid var(--surface-border);
    }

    /* Markdown elements */
    .offer-markdown :global(p)      { margin: 0 0 1rem; }
    .offer-markdown :global(strong) { font-weight: 600; color: var(--text-color); }
    .offer-markdown :global(em)     { color: var(--text-color-secondary); }
    .offer-markdown :global(hr)     { border: none; border-top: 1px solid var(--surface-border); margin: 1rem 0; }

    .loading-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 2.5rem 0;
      color: var(--text-color-secondary);
      font-size: 0.9rem;
    }
  `]
})
export class OfferGenerationDialogComponent implements OnChanges, OnDestroy {

  // ── Inputs / Outputs ─────────────────────────────────────────────────────
  @Input() besoinId: number | null = null;
  @Input() visible                 = false;
  @Output() visibleChange          = new EventEmitter<boolean>();

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly aiOfferService = inject(AiOfferService);
  private readonly notification   = inject(NotificationService);
  private readonly sanitizer      = inject(DomSanitizer);
  private readonly cdr            = inject(ChangeDetectorRef);

  // ── State ─────────────────────────────────────────────────────────────────
  loading:         boolean  = false;
  renderedContent: SafeHtml = '';
  rawContent:      string   = '';
  copied:          boolean  = false;

  private subscription: Subscription | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    const v = changes['visible'];
    if (!v) return;
    if (v.currentValue === true  && this.besoinId != null) this.generate();
    if (v.currentValue === false) this.reset();
  }

  ngOnDestroy(): void {
    this.reset();
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  close(): void { this.visibleChange.emit(false); }

  copy(): void {
    if (!this.rawContent) return;
    navigator.clipboard.writeText(this.rawContent).then(() => {
      this.copied = true;
      this.cdr.markForCheck();
      this.copyTimer = setTimeout(() => {
        this.copied = false;
        this.cdr.markForCheck();
      }, 2500);
    });
  }

  onDialogHide(): void { this.reset(); }

  // ── Private ───────────────────────────────────────────────────────────────

  private generate(): void {
    this.loading         = true;
    this.renderedContent = '';
    this.rawContent      = '';
    this.copied          = false;
    this.cdr.markForCheck();

    this.subscription = this.aiOfferService.generateOffer(this.besoinId!).subscribe({
      next: response => {
        this.rawContent      = response.content;
        this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(
          marked.parse(response.content) as string
        );
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.loading = false;
        this.notification.error(
          err.message || 'Une erreur est survenue lors de la génération.',
          'Génération IA'
        );
        this.close();
      }
    });
  }

  private reset(): void {
    this.subscription?.unsubscribe();
    this.subscription    = null;
    this.loading         = false;
    this.renderedContent = '';
    this.rawContent      = '';
    this.copied          = false;
  }
}
