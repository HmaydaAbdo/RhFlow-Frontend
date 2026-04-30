import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { BesoinRecrutementService } from '../../services/besoin-recrutement.service';
import { BesoinStatsResponse } from '../../models/besoin-recrutement.models';

@Component({
  selector: 'app-besoin-stats-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonModule,
    ChartModule
  ],
  templateUrl: './besoin-stats-widget.component.html',
})
export class BesoinStatsWidgetComponent implements OnInit {

  private readonly service     = inject(BesoinRecrutementService);
  private readonly cdr         = inject(ChangeDetectorRef);
  private readonly destroyRef  = inject(DestroyRef);

  stats: BesoinStatsResponse | null = null;
  loading = true;

  // Chart data
  barChartData: any = null;
  doughnutChartData: any = null;
  barChartOptions: any = null;
  doughnutChartOptions: any = null;

  ngOnInit(): void {
    this.service.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: stats => {
          this.stats   = stats;
          this.loading = false;
          this.buildCharts(stats);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private buildCharts(stats: BesoinStatsResponse): void {
    const docStyle    = getComputedStyle(document.documentElement);
    const textColor   = docStyle.getPropertyValue('--text-color').trim() || '#4b5563';
    const borderColor = docStyle.getPropertyValue('--surface-border').trim() || '#e5e7eb';
    const textMuted   = docStyle.getPropertyValue('--text-color-secondary').trim() || '#9ca3af';

    // ── Bar chart (par direction) ─────────────────────────────────────────
    this.barChartData = {
      labels: stats.parDirection.map(d => d.directionNom),
      datasets: [{
        label: 'Besoins',
        data:  stats.parDirection.map(d => d.total),
        backgroundColor: stats.parDirection.map((_, i) => this.barColor(i)),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 40
      }]
    };

    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.raw} besoin(s)`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textMuted, font: { size: 11 } },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          ticks: { color: textMuted, font: { size: 11 }, stepSize: 1 },
          grid: { color: borderColor },
          border: { display: false }
        }
      }
    };

    // ── Doughnut chart (par priorité) ─────────────────────────────────────
    this.doughnutChartData = {
      labels: stats.parPriorite.map(p => this.prioriteDisplayLabel(p.priorite)),
      datasets: [{
        data:            stats.parPriorite.map(p => p.total),
        backgroundColor: ['#ef4444', '#f59e0b', '#94a3b8'],
        hoverOffset:     6,
        borderWidth:     2,
        borderColor:     '#ffffff'
      }]
    };

    this.doughnutChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:     textColor,
            font:      { size: 11 },
            padding:   12,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.raw} besoin(s)`
          }
        }
      }
    };
  }

  private barColor(index: number): string {
    const palette = [
      '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
      '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6'
    ];
    return palette[index % palette.length];
  }

  private prioriteDisplayLabel(p: string): string {
    const map: Record<string, string> = { HAUTE: 'Haute', NORMALE: 'Normale', BASSE: 'Basse' };
    return map[p] ?? p;
  }
}
