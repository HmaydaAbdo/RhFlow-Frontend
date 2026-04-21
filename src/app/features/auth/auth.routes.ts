import {LoginComponent} from "./pages/login/login.component";
import {Routes} from "@angular/router";

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
];
