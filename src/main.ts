import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // 👇 Permite que Swagger cargue sus scripts/estilos en local
  app.use(
    helmet({
      contentSecurityPolicy: false, // <- clave para Swagger UI
      crossOriginEmbedderPolicy: false, // fuentes y assets
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('MyFilm API')
    .setDescription('Endpoints públicos de MyFilm')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true, docExpansion: 'list' },
    customSiteTitle: 'MyFilm API',
  });

  const port = 3001;
  await app.listen(port);

  console.log('\n🚀 MyFilm API corriendo:');
  console.log(`   ➜  Local:      http://localhost:${port}/api`);
  console.log(`   📘 Swagger:    http://localhost:${port}/api/docs\n`);
}

bootstrap();
