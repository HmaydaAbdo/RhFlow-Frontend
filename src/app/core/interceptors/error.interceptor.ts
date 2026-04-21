import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from "../services/NotificationService";
import { ValidationErrorResponse } from "../models/api-response.models";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {

  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      switch (error.status) {
        case 0:
          notification.error('Impossible de contacter le serveur', 'Erreur réseau');
          break;
        case 400: {
          const body = error.error as ValidationErrorResponse;
          if (body?.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
            const messages = Object.values(body.fieldErrors).join(' · ');
            notification.error(messages, 'Erreur de validation');
          } else {
            notification.error(body?.message || 'Données invalides', 'Erreur de validation');
          }
          break;
        }
        case 403:
          notification.error('Vous n\'avez pas les droits nécessaires', 'Accès refusé');
          break;
        case 404:
          notification.error('Ressource introuvable', 'Non trouvé');
          break;
        case 409:
          notification.error(error.error?.message || 'Conflit de données', 'Conflit');
          break;
        case 500:
          notification.error('Erreur interne du serveur', 'Erreur serveur');
          break;
        // 401 handled by auth interceptor
      }

      return throwError(() => error);
    })
  );
};
