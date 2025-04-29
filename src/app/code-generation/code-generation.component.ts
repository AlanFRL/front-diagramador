// File: src/app/code-generation/code-generation.component.ts

import { Component, Input } from '@angular/core';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Nuevas interfaces para interpretar tu JSON
interface CrudPage {
  crudKey: number;
  crudName: string;
  children: (Navbar | Sidebar | List)[];
}

interface Navbar {
  type: 'Navbar';
  key: number;
  name: string;
  links: LinkButton[];
}

interface Sidebar {
  type: 'Sidebar';
  key: number;
  name: string;
  links: LinkButton[];
}

interface List {
  type: 'List';
  key: number;
  name: string;
  modelName: string;
  attributes: Attribute[];
  crudButtons: CrudButton[];
}

interface Attribute {
  name: string;
  type: string;
  label: string;
}

interface CrudButton {
  action: 'crear' | 'editar' | 'eliminar';
}

interface LinkButton {
  text: string;
  routerLink: string;
}

@Component({
  selector: 'app-code-generation',
  templateUrl: './code-generation.component.html',
  styleUrls: ['./code-generation.component.css'],
})
export class CodeGenerationComponent {
  @Input() model: string = '';

  constructor() {}

  // 🧩 1. Parsear el modelo JSON a una estructura útil
  parseModel(): CrudPage[] {
    if (!this.model) {
      console.error('No hay modelo disponible.');
      return [];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(this.model);
    } catch (error) {
      console.error('Error al parsear el modelo JSON:', error);
      return [];
    }

    const nodes = parsed.nodeDataArray || [];

    // 1. Encontrar todos los CRUD
    const crudPages: CrudPage[] = nodes
      .filter((n: any) => n.category === 'Crud')
      .map((crudNode: any) => {
        const crudKey = crudNode.key;
        const crudName = crudNode.text || 'Unnamed CRUD';

        // 2. Buscar sus hijos: Navbar, Sidebar y List
        const children = nodes.filter((n: any) => n.group === crudKey);

        // Procesar Navbar
        const navbars: Navbar[] = children
          .filter((n: any) => n.category === 'Navbar')
          .map((navbar: any) => this.parseNavbar(navbar, nodes));

        // Procesar Sidebar
        const sidebars: Sidebar[] = children
          .filter((n: any) => n.category === 'Sidebar')
          .map((sidebar: any) => this.parseSidebar(sidebar, nodes));

        // Procesar List
        const lists: List[] = children
          .filter((n: any) => n.category === 'List')
          .map((list: any) => this.parseList(list, nodes));

        // Devolver el CRUD
        return {
          crudKey,
          crudName,
          children: [...navbars, ...sidebars, ...lists],
        };
      });

    return crudPages;
  }

  private parseNavbar(navbarNode: any, nodes: any[]): Navbar {
    const navbarKey = navbarNode.key;
    const navbarName = navbarNode.text || 'Unnamed Navbar';

    const links = nodes
      .filter((n: any) => n.group === navbarKey && n.category === 'Link')
      .sort((a, b) => this.getLocationValue(a.location, 'x') - this.getLocationValue(b.location, 'x'))
      .map((link: any) => ({
        text: link.text || 'Link',
        routerLink: '/' + this.toKebabCase(link.routerLink || ''),
      }));
      

    return {
      type: 'Navbar',
      key: navbarKey,
      name: navbarName,
      links,
    };
  }

  private parseSidebar(sidebarNode: any, nodes: any[]): Sidebar {
    const sidebarKey = sidebarNode.key;
    const sidebarName = sidebarNode.text || 'Unnamed Sidebar';

    const links = nodes
      .filter((n: any) => n.group === sidebarKey && n.category === 'Link')
      .sort((a, b) => this.getLocationValue(a.location, 'y') - this.getLocationValue(b.location, 'y'))
      .map((link: any) => ({
        text: link.text || 'Link',
        routerLink: '/' + this.toKebabCase(link.routerLink || ''),
      }));      

    return {
      type: 'Sidebar',
      key: sidebarKey,
      name: sidebarName,
      links,
    };
  }

  private parseList(listNode: any, nodes: any[]): List {
    const listKey = listNode.key;
    const modelName = listNode.modelName || 'modelo';

    const attributes = nodes
      .filter((n: any) => n.group === listKey && n.category === 'Attribute')
      .sort((a, b) => this.getLocationValue(a.location, 'x') - this.getLocationValue(b.location, 'x'))
      .map((attr: any) => ({
        name: attr.name || 'campo',
        type: attr.type || 'string',
        label: attr.label || 'Campo',
      }));

    const crudButtons = nodes
      .filter((n: any) => n.group === listKey && n.category === 'CrudButton')
      .map((btn: any) => ({
        action: btn.inputType?.toLowerCase() || 'crear',
      }));

    return {
      type: 'List',
      key: listKey,
      name: listNode.text || 'Lista',
      modelName,
      attributes,
      crudButtons,
    };
  }

  private parseCrudButtonsGlobal(crudNode: any, nodes: any[]): string[] {
    const crudKey = crudNode.key;

    const globalActions = nodes
      .filter((n: any) => n.group === crudKey && n.category === 'CrudButton')
      .map((btn: any) => btn.inputType?.toLowerCase() || '');

    return globalActions;
  }

  // 🧩 2. Generar todos los archivos en base al modelo parseado
  // 🧩 Dentro de tu CodeGenerationComponent

  generateFiles(crudPages: CrudPage[]): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];
  
    // Banderas para no duplicar componentes
    let navbarGenerated = false;
    let sidebarGenerated = false;
  
    for (const crud of crudPages) {
      const crudName = this.toKebabCase(crud.crudName);
      const modelName = this.getModelNameFromCrud(crud);
  
      const pagePath = `src/app/pages/${crudName}/`;
      const modelPath = `src/app/models/`;
      const servicePath = `src/app/services/`;
      const sharedPathNavbar = `src/app/shared/navbar/`;
      const sharedPathSidebar = `src/app/shared/sidebar/`;
  
      // Crear modelos
      files.push({
        path: `${modelPath}${modelName}.model.ts`,
        content: this.generateModel(crud),
      });
  
      // Crear servicios
      files.push({
        path: `${servicePath}${modelName}.service.ts`,
        content: this.generateService(crud),
      });
  
      // Crear páginas CRUD
      files.push({ path: `${pagePath}${modelName}-index.component.ts`, content: this.generateIndexComponent(crud) });
      files.push({ path: `${pagePath}${modelName}-index.component.html`, content: this.generateIndexHtml(crud) });
      files.push({ path: `${pagePath}${modelName}-create.component.ts`, content: this.generateCreateComponent(crud) });
      files.push({ path: `${pagePath}${modelName}-create.component.html`, content: this.generateCreateHtml(crud) });
      files.push({ path: `${pagePath}${modelName}-edit.component.ts`, content: this.generateEditComponent(crud) });
      files.push({ path: `${pagePath}${modelName}-edit.component.html`, content: this.generateEditHtml(crud) });
  
      // Navbar y Sidebar (solo una vez)
      if (!navbarGenerated && crud.children.some((c) => c.type === 'Navbar')) {
        files.push({ path: `${sharedPathNavbar}navbar.component.ts`, content: this.generateNavbarComponent(crud) });
        files.push({ path: `${sharedPathNavbar}navbar.component.html`, content: this.generateNavbarHtml(crud) });
        navbarGenerated = true;
      }
      if (!sidebarGenerated && crud.children.some((c) => c.type === 'Sidebar')) {
        files.push({ path: `${sharedPathSidebar}sidebar.component.ts`, content: this.generateSidebarComponent(crud) });
        files.push({ path: `${sharedPathSidebar}sidebar.component.html`, content: this.generateSidebarHtml(crud) });
        sidebarGenerated = true;
      }
    }
  
    // 🔥 Agregar también app.module.ts, app-routing.module.ts y app.component.ts
    files.push({ path: `src/app/app-routing.module.ts`, content: this.generateAppRoutingModule(crudPages) });
    files.push({ path: `src/app/app.module.ts`, content: this.generateAppModule(crudPages) });
    files.push({ path: `src/app/app.component.ts`, content: this.generateAppComponent() });
  
    return files;
  }
  

  private generateModel(crud: CrudPage): string {
    const list = crud.children.find((child) => child.type === 'List') as
      | List
      | undefined;

    if (!list) {
      console.warn('No se encontró una List en este CRUD:', crud.crudName);
      return '';
    }

    const modelNameCapitalized = this.capitalizeFirstLetter(list.modelName);

    const attributes = list.attributes.map((attr) => {
      const tsType = this.mapAttributeType(attr.type);
      return `  ${attr.name}: ${tsType};`;
    });

    return `export interface ${modelNameCapitalized} {
    id: number;
  ${attributes.join('\n')}
  }
  `;
  }

  private generateService(crud: CrudPage): string {
    const modelName = this.getModelNameFromCrud(crud); // Ej: "user"
    const className = this.capitalizeFirstLetter(modelName); // Ej: "User"
    const list = crud.children.find((child) => child.type === 'List') as List;
    const attributes = list ? list.attributes : [];

    return `
  import { Injectable } from '@angular/core';
  import { ${className} } from '../models/${modelName}.model';
  
  @Injectable({
    providedIn: 'root'
  })
  export class ${className}Service {
    private data: ${className}[] = [];
  
    constructor() {
      // Datos de ejemplo opcional
      this.data = [
        ${this.generateMockData(className, attributes)}
      ];
    }
  
    getAll(): ${className}[] {
      return this.data;
    }
  
    create(item: ${className}): void {
      this.data.push(item);
    }
  
    update(index: number, item: ${className}): void {
      if (index >= 0 && index < this.data.length) {
        this.data[index] = item;
      }
    }
  
    delete(index: number): void {
      if (index >= 0 && index < this.data.length) {
        this.data.splice(index, 1);
      }
    }
  
    getByIndex(index: number): ${className} | null {
      if (index >= 0 && index < this.data.length) {
        return this.data[index];
      }
      return null;
    }
  }
  `;
  }

  private generateNavbarComponent(crud: CrudPage): string {
    return `
  import { Component, Input } from '@angular/core';
  
  @Component({
    selector: 'app-shared-navbar',
    templateUrl: './navbar.component.html'
  })
  export class NavbarComponent {
    @Input() links: { text: string; routerLink: string }[] = [];
  }
  `;
  }

  private generateNavbarHtml(crud: CrudPage): string {
    return `
  <nav class="navbar navbar-expand-lg navbar-light bg-light mb-3">
    <div class="container-fluid">
      <a 
        *ngFor="let link of links" 
        class="navbar-brand" 
        [routerLink]="link.routerLink">
        {{ link.text }}
      </a>
    </div>
  </nav>
  `;
  }

  private generateSidebarComponent(crud: CrudPage): string {
    return `
  import { Component, Input } from '@angular/core';
  
  @Component({
    selector: 'app-shared-sidebar',
    templateUrl: './sidebar.component.html'
  })
  export class SidebarComponent {
    @Input() links: { text: string; routerLink: string }[] = [];
  }
  `;
  }

  private generateSidebarHtml(crud: CrudPage): string {
    return `
  <aside class="col-2 bg-light p-3">
    <ul class="nav flex-column">
      <li 
        *ngFor="let link of links" 
        class="nav-item">
        <a 
          class="nav-link" 
          [routerLink]="link.routerLink">
          {{ link.text }}
        </a>
      </li>
    </ul>
  </aside>
  `;
  }

  private generateIndexComponent(crud: CrudPage): string {
    const modelName = this.getModelNameFromCrud(crud);
    const className = this.capitalizeFirstLetter(modelName);
    const navbar = crud.children.find((c) => c.type === 'Navbar') as Navbar;
    const sidebar = crud.children.find((c) => c.type === 'Sidebar') as Sidebar;

    return `
  import { Component } from '@angular/core';
  import { ${className}Service } from '../../services/${modelName}.service';
  import { ${className} } from '../../models/${modelName}.model';
  
  @Component({
    selector: 'app-${modelName}-index',
    templateUrl: './${modelName}-index.component.html'
  })
  export class ${className}IndexComponent {
    items: ${className}[] = [];
  
    // 🔥 Para navbar y sidebar
    navbarLinks = ${navbar ? JSON.stringify(navbar.links, null, 2) : '[]'};
    sidebarLinks = ${sidebar ? JSON.stringify(sidebar.links, null, 2) : '[]'};
  
    constructor(private service: ${className}Service) {
      this.items = this.service.getAll();
    }
  
    delete(index: number): void {
      this.service.delete(index);
      this.items = this.service.getAll();
    }
  }
    `;
  }

  private generateIndexHtml(crud: CrudPage): string {
    const modelName = this.getModelNameFromCrud(crud);
    const crudName = this.toKebabCase(crud.crudName);
    const list = crud.children.find((c) => c.type === 'List') as List;
    const hasNavbar = crud.children.some((c) => c.type === 'Navbar');
    const hasSidebar = crud.children.some((c) => c.type === 'Sidebar');

    const tableHeaders = list.attributes
      .map((attr) => `<th>${attr.label}</th>`)
      .join('\n        ');

    const tableRows = list.attributes
      .map((attr) => {
        if (attr.type === 'date') {
          return `<td>{{ item.${attr.name} | date:'yyyy-MM-dd' }}</td>`;
        } else if (attr.type === 'checkbox') {
          return `<td><input type=\"checkbox\" [checked]="item.${attr.name}" disabled></td>`;
        } else {
          return `<td>{{ item.${attr.name} }}</td>`;
        }
      })
      .join('\n        ');

    return `
    <div class=\"container-fluid\">
  
      ${hasNavbar ? '<app-shared-navbar [links]="navbarLinks"></app-shared-navbar>' : ''}
  
      <div class=\"row\">
        ${hasSidebar ? '<div class=\"col-2\"><app-shared-sidebar [links]="sidebarLinks"></app-shared-sidebar></div>' : ''}
        <main class=\"${hasSidebar ? 'col-10' : 'col-12'}\">
          <h1>${crud.crudName}</h1>
          <a routerLink=\"/${crudName}/create\" class=\"btn btn-primary mb-3\">Crear Nuevo</a>
  
          <table class=\"table table-bordered table-striped\">
            <thead>
              <tr>
                <th>#</th>
                ${tableHeaders}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor=\"let item of items; let i = index\">
                <td>{{ i + 1 }}</td>
                ${tableRows}
                <td>
                  <a [routerLink]=\"['/${crudName}/edit', i]\" class=\"btn btn-sm btn-warning\">Editar</a>
                  <button (click)=\"delete(i)\" class=\"btn btn-sm btn-danger ms-2\">Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </main>
      </div>
  
    </div>
    `;
  }


  private generateCreateComponent(crud: CrudPage): string {
    const modelName = this.getModelNameFromCrud(crud);
    const className = this.capitalizeFirstLetter(modelName);
    const navbar = crud.children.find((c) => c.type === 'Navbar') as Navbar;
    const sidebar = crud.children.find((c) => c.type === 'Sidebar') as Sidebar;

    return `
  import { Component } from '@angular/core';
  import { Router } from '@angular/router';
  import { ${className}Service } from '../../services/${modelName}.service';
  import { ${className} } from '../../models/${modelName}.model';
  
  @Component({
    selector: 'app-${modelName}-create',
    templateUrl: './${modelName}-create.component.html'
  })
  export class ${className}CreateComponent {
    item: ${className} = { id: 0, ${this.getAttributesDefaultValues(crud)} };
  
    // 🔥 Para navbar y sidebar
    navbarLinks = ${navbar ? JSON.stringify(navbar.links, null, 2) : '[]'};
    sidebarLinks = ${sidebar ? JSON.stringify(sidebar.links, null, 2) : '[]'};
  
    constructor(private service: ${className}Service, private router: Router) {}
  
    save(): void {
      this.service.create(this.item);
      this.router.navigate(['/${this.toKebabCase(crud.crudName)}']);
    }
  }
    `;
  }

  private generateCreateHtml(crud: CrudPage): string {
    const list = crud.children.find((c) => c.type === 'List') as List;
    const crudName = this.toKebabCase(crud.crudName);
    const hasNavbar = crud.children.some((c) => c.type === 'Navbar');
    const hasSidebar = crud.children.some((c) => c.type === 'Sidebar');
  
    const formFields = list.attributes
      .map((attr) => {
        if (attr.type === 'checkbox') {
          return `
          <div class="form-check mb-3">
            <input type="checkbox" class="form-check-input" id="${attr.name}" [(ngModel)]="item.${attr.name}" name="${attr.name}">
            <label class="form-check-label" for="${attr.name}">${attr.label}</label>
          </div>
          `;
        } else if (attr.type === 'date') {
          return `
          <div class="mb-3">
            <label>${attr.label}</label>
            <input class="form-control" [(ngModel)]="item.${attr.name}" name="${attr.name}" type="date" required />
          </div>
          `;
        } else {
          return `
          <div class="mb-3">
            <label>${attr.label}</label>
            <input class="form-control" [(ngModel)]="item.${attr.name}" name="${attr.name}" type="text" required />
          </div>
          `;
        }
      })
      .join('\n');
  
    return `
    <div class="container-fluid">
  
      ${hasNavbar ? '<app-shared-navbar [links]="navbarLinks"></app-shared-navbar>' : ''}
  
      <div class="row">
        ${hasSidebar ? '<div class="col-2"><app-shared-sidebar [links]="sidebarLinks"></app-shared-sidebar></div>' : ''}
        <main class="${hasSidebar ? 'col-10' : 'col-12'}">
          <h2>Crear Nuevo ${list.modelName}</h2>
          <form (ngSubmit)="save()">
            ${formFields}
            <div class="d-flex">
              <button type="submit" class="btn btn-success">Guardar</button>
              <a routerLink="/${crudName}" class="btn btn-secondary ms-2">Cancelar</a>
            </div>
          </form>
        </main>
      </div>
  
    </div>
    `;
  }
  

  private generateEditComponent(crud: CrudPage): string {
    const modelName = this.getModelNameFromCrud(crud);
    const className = this.capitalizeFirstLetter(modelName);
    const navbar = crud.children.find((c) => c.type === 'Navbar') as Navbar;
    const sidebar = crud.children.find((c) => c.type === 'Sidebar') as Sidebar;

    return `
  import { Component } from '@angular/core';
  import { ActivatedRoute, Router } from '@angular/router';
  import { ${className}Service } from '../../services/${modelName}.service';
  import { ${className} } from '../../models/${modelName}.model';
  
  @Component({
    selector: 'app-${modelName}-edit',
    templateUrl: './${modelName}-edit.component.html'
  })
  export class ${className}EditComponent {
    item: ${className} | null = null;
    index: number = -1;
  
    // 🔥 Para navbar y sidebar
    navbarLinks = ${navbar ? JSON.stringify(navbar.links, null, 2) : '[]'};
    sidebarLinks = ${sidebar ? JSON.stringify(sidebar.links, null, 2) : '[]'};
  
    constructor(
      private service: ${className}Service,
      private router: Router,
      private route: ActivatedRoute
    ) {
      this.index = Number(this.route.snapshot.paramMap.get('id'));
      this.item = this.service.getByIndex(this.index);
    }
  
    save(): void {
      if (this.item) {
        this.service.update(this.index, this.item);
        this.router.navigate(['/${this.toKebabCase(crud.crudName)}']);
      }
    }
  }
    `;
  }

  private generateEditHtml(crud: CrudPage): string {
    const list = crud.children.find((c) => c.type === 'List') as List;
    const crudName = this.toKebabCase(crud.crudName);
    const hasNavbar = crud.children.some((c) => c.type === 'Navbar');
    const hasSidebar = crud.children.some((c) => c.type === 'Sidebar');
  
    const formFields = list.attributes
      .map((attr) => {
        if (attr.type === 'checkbox') {
          return `
          <div class="form-check mb-3">
            <input type="checkbox" class="form-check-input" id="${attr.name}" [(ngModel)]="item.${attr.name}" name="${attr.name}">
            <label class="form-check-label" for="${attr.name}">${attr.label}</label>
          </div>
          `;
        } else if (attr.type === 'date') {
          return `
          <div class="mb-3">
            <label>${attr.label}</label>
            <input class="form-control" [(ngModel)]="item.${attr.name}" name="${attr.name}" type="date" required />
          </div>
          `;
        } else {
          return `
          <div class="mb-3">
            <label>${attr.label}</label>
            <input class="form-control" [(ngModel)]="item.${attr.name}" name="${attr.name}" type="text" required />
          </div>
          `;
        }
      })
      .join('\n');
  
    return `
    <div class="container-fluid">
  
      ${hasNavbar ? '<app-shared-navbar [links]="navbarLinks"></app-shared-navbar>' : ''}
  
      <div class="row">
        ${hasSidebar ? '<div class="col-2"><app-shared-sidebar [links]="sidebarLinks"></app-shared-sidebar></div>' : ''}
        <main class="${hasSidebar ? 'col-10' : 'col-12'}">
          <h2>Editar ${list.modelName}</h2>
          <form *ngIf="item" (ngSubmit)="save()">
            ${formFields}
            <div class="d-flex">
              <button type="submit" class="btn btn-primary">Actualizar</button>
              <a routerLink="/${crudName}" class="btn btn-secondary ms-2">Cancelar</a>
            </div>
          </form>
        </main>
      </div>
  
    </div>
    `;
  }
  

  private generateAppRoutingModule(crudPages: CrudPage[]): string {
    const imports = crudPages.flatMap((crud) => {
      const crudNameKebab = this.toKebabCase(crud.crudName);
      const modelName = this.getModelNameFromCrud(crud);
      const className = this.capitalizeFirstLetter(modelName);
      return [
        `import { ${className}IndexComponent } from './pages/${crudNameKebab}/${modelName}-index.component';`,
        `import { ${className}CreateComponent } from './pages/${crudNameKebab}/${modelName}-create.component';`,
        `import { ${className}EditComponent } from './pages/${crudNameKebab}/${modelName}-edit.component';`,
      ];
    }).join('\n');
  
    const routes = crudPages.flatMap((crud) => {
      const crudNameKebab = this.toKebabCase(crud.crudName);
      return [
        `{ path: '${crudNameKebab}', component: ${this.capitalizeFirstLetter(this.getModelNameFromCrud(crud))}IndexComponent },`,
        `{ path: '${crudNameKebab}/create', component: ${this.capitalizeFirstLetter(this.getModelNameFromCrud(crud))}CreateComponent },`,
        `{ path: '${crudNameKebab}/edit/:id', component: ${this.capitalizeFirstLetter(this.getModelNameFromCrud(crud))}EditComponent },`,
      ];
    }).join('\n  ');
  
    const defaultCrud = crudPages.length > 0 ? this.toKebabCase(crudPages[0].crudName) : '';
  
    return `
  import { NgModule } from '@angular/core';
  import { RouterModule, Routes } from '@angular/router';
  
  ${imports}
  
  const routes: Routes = [
    ${routes}
    { path: '', redirectTo: '/${defaultCrud}', pathMatch: 'full' },
  ];
  
  @NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule {}
    `.trim();
  }

  private generateAppModule(crudPages: CrudPage[]): string {
    let hasNavbar = false;
    let hasSidebar = false;
  
    // Detectar si al menos un CRUD tiene Navbar o Sidebar
    for (const crud of crudPages) {
      if (crud.children.some(c => c.type === 'Navbar')) {
        hasNavbar = true;
      }
      if (crud.children.some(c => c.type === 'Sidebar')) {
        hasSidebar = true;
      }
    }
  
    const imports = crudPages.flatMap((crud) => {
      const crudNameKebab = this.toKebabCase(crud.crudName);
      const modelName = this.getModelNameFromCrud(crud);
      const className = this.capitalizeFirstLetter(modelName);
      return [
        `import { ${className}IndexComponent } from './pages/${crudNameKebab}/${modelName}-index.component';`,
        `import { ${className}CreateComponent } from './pages/${crudNameKebab}/${modelName}-create.component';`,
        `import { ${className}EditComponent } from './pages/${crudNameKebab}/${modelName}-edit.component';`,
      ];
    }).join('\n');
  
    return `
  import { NgModule } from '@angular/core';
  import { BrowserModule } from '@angular/platform-browser';
  import { FormsModule } from '@angular/forms';
  import { RouterModule } from '@angular/router';
  
  import { AppComponent } from './app.component';
  import { AppRoutingModule } from './app-routing.module';
  
  ${hasNavbar ? `import { NavbarComponent } from './shared/navbar/navbar.component';` : ''}
  ${hasSidebar ? `import { SidebarComponent } from './shared/sidebar/sidebar.component';` : ''}
  
  ${imports}
  
  @NgModule({
    declarations: [
      AppComponent,
      ${hasNavbar ? 'NavbarComponent,' : ''}
      ${hasSidebar ? 'SidebarComponent,' : ''}
      ${crudPages.flatMap((crud) => {
        const modelName = this.getModelNameFromCrud(crud);
        const className = this.capitalizeFirstLetter(modelName);
        return [
          `${className}IndexComponent`,
          `${className}CreateComponent`,
          `${className}EditComponent`,
        ];
      }).join(',\n    ')}
    ],
    imports: [
      BrowserModule,
      FormsModule,
      RouterModule,
      AppRoutingModule
    ],
    providers: [],
    bootstrap: [AppComponent]
  })
  export class AppModule {}
    `.trim();
  }
  

  private generateAppComponent(): string {
    return `
  import { Component } from '@angular/core';
  
  @Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>'
  })
  export class AppComponent {}
    `.trim();
  }
  
  private getLocationValue(location: string, axis: 'x' | 'y'): number {
    if (!location) return 0;
    const parts = location.split(' ').map(Number);
    if (axis === 'x') {
      return parts[0] || 0;
    } else {
      return parts[1] || 0;
    }
  }
  
  
  

  private getAttributesDefaultValues(crud: CrudPage): string {
    const list = crud.children.find((child) => child.type === 'List') as List;
    if (!list) return '';

    return list.attributes
      .map((attr) => `${attr.name}: ${this.getDefaultValue(attr.type)}`)
      .join(', ');
  }

  private getDefaultValue(type: string): string {
    switch (type.toLowerCase()) {
      case 'string':
        return `''`;
      case 'number':
        return `0`;
      case 'date':
        return `new Date()`;
      case 'boolean':
        return `false`;
      default:
        return `''`;
    }
  }

  private generateMockData(className: string, attributes: Attribute[]): string {
    const exampleItem = attributes
      .map((attr) => {
        if (attr.type === 'text') {
          return `${attr.name}: '${attr.label}'`;
        } else if (attr.type === 'number') {
          return `${attr.name}: 23`;
        } else if (attr.type === 'date') {
          return `${attr.name}: new Date('2001-06-29')`;
        } else if (attr.type === 'checkbox') {
          return `${attr.name}: false`;
        } else {
          return `${attr.name}: 'Marina Cadima'`;
        }
      })
      .join(',\n      ');

    return `{
    id: 1,
        ${exampleItem}
      }`;
  }

  private capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private mapAttributeType(type: string): string {
    switch (type.toLowerCase()) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'date':
        return 'Date';
      case 'boolean':
        return 'boolean';
      default:
        return 'any';
    }
  }

  private toKebabCase(text: string): string {
    return text
      .replace(/\s+/g, '-') // espacios por guiones
      .replace(/[^\w\-]+/g, '') // quitar caracteres raros
      .toLowerCase();
  }

  private getModelNameFromCrud(crud: CrudPage): string {
    const list = crud.children.find((child) => child.type === 'List') as
      | List
      | undefined;
    return list ? list.modelName.toLowerCase() : 'model';
  }

  // 🧩 3. Descargar los archivos como un ZIP
  downloadZip() {
    const parsedPages = this.parseModel();
    const files = this.generateFiles(parsedPages);

    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.path, file.content);
    });

    zip
      .generateAsync({ type: 'blob' })
      .then((content) => {
        saveAs(content, 'angular_mockup_project.zip');
      })
      .catch((error) => console.error('Error al generar el ZIP:', error));
  }
}
