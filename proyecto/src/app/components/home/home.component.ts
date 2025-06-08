import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Rally, Photo } from '../../interfaces/api.interfaces';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container mt-4">
      <!-- Navigation -->
      <nav class="navbar navbar-expand-lg navbar-light bg-light mb-4">
        <div class="container-fluid">
          <a class="navbar-brand" href="#">RallyLens</a>
          <div class="navbar-nav ms-auto">
            <a class="nav-link" routerLink="/login">Login</a>
            <a class="nav-link" routerLink="/register">Register</a>
          </div>
        </div>
      </nav>

      <!-- Current Rally -->
      <div class="card mb-4">
        <div class="card-body">
          <div *ngIf="currentRally">
            <h2>{{currentRally.name}}</h2>
            <p class="lead">{{currentRally.theme}}</p>
            <p>
              <strong>Start date:</strong> {{currentRally.start_date | date}}<br>
              <strong>End date:</strong> {{currentRally.end_date | date}}
            </p>
          </div>
          <div *ngIf="!currentRally" class="alert alert-info">
            There is no active rally at the moment.
          </div>
        </div>
      </div>

      <!-- Photos Grid -->
      <div class="card">
        <div class="card-body">
          <h2>Published Photos</h2>
          <div class="row">
            <div *ngFor="let photo of photos" class="col-md-4 mb-4">
              <div class="card h-100">
                <div class="image-container">
                  <img [src]="photo.file" class="card-img-top" [alt]="photo.title">
                </div>
                <div class="card-body">
                  <h5 class="card-title">{{photo.title}}</h5>
                  <p class="card-text">{{photo.description}}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .image-container {
      position: relative;
      width: 100%;
      padding-top: 75%; /* 4:3 Aspect Ratio */
      overflow: hidden;
      border-radius: 8px;
    }
    .image-container img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .image-container:hover img {
      transform: scale(1.05);
    }
    .card {
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease;
      border-radius: 12px;
      overflow: hidden;
    }
    .card:hover {
      transform: translateY(-5px);
    }
    .card-body {
      flex: 1;
    }
    .lead {
      color: #2c4a3e;
      font-weight: 500;
    }
    h2 {
      color: #1a202c;
      margin-bottom: 1rem;
      font-weight: 600;
    }
    .alert-info {
      background: linear-gradient(135deg, rgba(44, 74, 62, 0.1), rgba(35, 76, 61, 0.2));
      border: none;
      border-radius: 8px;
      color: #2c4a3e;
      border-left: 4px solid #2c4a3e;
    }
    .card-title {
      color: #2c4a3e;
      font-weight: 600;
    }
    .card-text {
      color: #4a5568;
    }
    p strong {
      color: #2c4a3e;
    }
  `]
})
export class HomeComponent implements OnInit {
  currentRally: Rally | null = null;
  photos: Photo[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadCurrentRally();
    this.loadPhotos();
  }

  loadCurrentRally() {
    this.apiService.getCurrentRally().subscribe({
      next: (rally) => this.currentRally = rally,
      error: (error) => console.error('Error loading rally:', error)
    });
  }

  loadPhotos() {
    this.apiService.getPhotos().subscribe({
      next: (photos) => this.photos = photos.filter(p => p.state === 'aceptada'),
      error: (error) => console.error('Error loading photos:', error)
    });
  }
} 