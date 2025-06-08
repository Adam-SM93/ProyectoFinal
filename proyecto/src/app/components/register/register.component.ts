import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="register-container">
      <div class="form-box">
        <form (ngSubmit)="onSubmit()">
          <h1>Register</h1>
          <div class="input-box">
            <input type="text" placeholder="Username" [(ngModel)]="username" name="username" required>
            <i class="bx bxs-user"></i>
          </div>
          <div class="input-box">
            <input type="email" placeholder="Email" [(ngModel)]="email" name="email" required>
            <i class="bx bxs-envelope"></i>
          </div>
          <div class="input-box">
            <input type="password" placeholder="Password" [(ngModel)]="password" name="password" required>
            <i class="bx bxs-lock-alt"></i>
          </div>
          <button type="submit" class="btn">Create Account</button>
          <p>Already have an account? <a routerLink="/login" class="login-link">Login here</a></p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.8), rgba(44, 74, 62, 0.2));
    }

    .register-container {
      position: relative;
      width: 420px;
      background: #fff;
      border-radius: 30px;
      box-shadow: 0 0 30px rgba(44, 74, 62, 0.2);
      padding: 40px;
      margin: 20px;
    }

    .form-box {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    form {
      width: 100%;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 36px;
      margin-bottom: 30px;
      color: #2c4a3e;
      text-align: center;
    }

    .input-box {
      position: relative;
      margin: 30px 0;
    }

    .input-box input {
      width: 100%;
      padding: 13px 50px 13px 20px;
      background: #f5f5f5;
      border-radius: 12px;
      border: 2px solid transparent;
      outline: none;
      font-size: 16px;
      color: #333;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .input-box input:focus {
      border-color: #2c4a3e;
      background: #fff;
    }

    .input-box input::placeholder {
      color: #888;
      font-weight: 400;
    }

    .input-box i {
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      color: #2c4a3e;
    }

    .btn {
      width: 100%;
      height: 48px;
      background: linear-gradient(45deg, #2c4a3e, #3c6354);
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(44, 74, 62, 0.2);
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #fff;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(44, 74, 62, 0.3);
      background: linear-gradient(45deg, #3c6354, #4a7b69);
    }

    p {
      font-size: 14.5px;
      margin: 20px 0;
      text-align: center;
      color: #666;
    }

    .login-link {
      color: #2c4a3e;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .login-link:hover {
      color: #3c6354;
    }

    @media screen and (max-width: 480px) {
      .register-container {
        width: 100%;
        margin: 20px;
        padding: 30px;
      }
    }
  `]
})
export class RegisterComponent {
  username: string = '';
  email: string = '';
  password: string = '';

  onSubmit() {
    // Implement register logic here
    console.log('Register attempt:', { username: this.username, email: this.email, password: this.password });
  }
} 