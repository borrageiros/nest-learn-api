// courses.controller.ts
import { Controller, Post, Get, Req, Delete, Param, Body, UseGuards, NotFoundException, UnauthorizedException, BadRequestException, HttpException, HttpStatus, Put } from '@nestjs/common';
import { CourseService } from './courses.service';
import { Course } from './courses.schema';
import { Auth0Guard, auth0Access } from 'src/auth/auth0.guard';
import axios from 'axios';
import { Request } from 'express';

@Controller('rest/courses')
@UseGuards(Auth0Guard)
export class CourseController {
    constructor(private readonly courseService: CourseService) { }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }

    private async getUserFromToken(token: string): Promise<any> {
        try {
            const response = await axios.get('https://fct-netex.eu.auth0.com/userinfo', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data;
        } catch (error) {
            throw new NotFoundException('Usuario no encontrado');
        }
    }

    private async verifyUserIsAdmin(userSub: string): Promise<void> {
        const userRolesResponse = await axios.get(`https://fct-netex.eu.auth0.com/api/v2/users/${encodeURIComponent(userSub)}/roles`, {
            headers: {
                Authorization: `Bearer ${await auth0Access()}`,
            },
        });
        const userRoles = userRolesResponse.data;
        if (!userRoles.some(role => role.name === "admin")) {
            throw new UnauthorizedException('Usuario no autorizado');
        }
    }

    // POSTS

    @Post()
    async createCourse(@Req() request: Request, @Body() courseData: Course): Promise<{ status: HttpStatus, message: string }> {
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('Token no encontrado');
        }
        const user = await this.getUserFromToken(token);
        await this.verifyUserIsAdmin(user.sub);

        try {
            await this.courseService.createCourse(courseData, user.sub);
            return { status: HttpStatus.CREATED, message: 'Curso creado correctamente' };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw new HttpException('Error en la solicitud', HttpStatus.BAD_REQUEST);
            } else if (error instanceof UnauthorizedException) {
                throw new HttpException('Acceso no autorizado', HttpStatus.UNAUTHORIZED);
            } else {
                throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }

    // GETS

    @Get()
    async getAllCourses(): Promise<Course[]> {
        try {
            return await this.courseService.getAllCourses();
        } catch (error) {
            throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':id')
    async getCourseById(@Req() request: Request, @Param('id') id: string): Promise<Course> {
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('Token no encontrado');
        }

        const course = await this.courseService.getCourseById(id);
        if (!course) {
            throw new NotFoundException('Curso no encontrado');
        }

        try {
            return course;
        } catch (error) {
            throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // PUTS
    @ Put(':id')
    async updateCourseById(@Req() request: Request, @Param('id') id: string, @Body() courseData: Course): Promise<{ status: HttpStatus, message: string }> {
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('Token no encontrado');
        }
        const user = await this.getUserFromToken(token);
        await this.verifyUserIsAdmin(user.sub);

        const course = await this.courseService.getCourseById(id);
        if (!course) {
            throw new NotFoundException('Curso no encontrado');
        }

        try {
            await this.courseService.updateCourseById(id, courseData);
            return { status: HttpStatus.OK, message: 'Curso actualizado correctamente' };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw new HttpException('Error en la solicitud', HttpStatus.BAD_REQUEST);
            } else if (error instanceof UnauthorizedException) {
                throw new HttpException('Acceso no autorizado', HttpStatus.UNAUTHORIZED);
            } else {
                throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }
    

    // DELETES

    @Delete(':id')
    async deleteCourseById(@Req() request: Request, @Param('id') id: string): Promise<{ status: HttpStatus, message: string }> {
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('Token no encontrado');
        }
        const user = await this.getUserFromToken(token);
        await this.verifyUserIsAdmin(user.sub);

        const course = await this.courseService.getCourseById(id);
        if (!course) {
            throw new NotFoundException('Curso no encontrado');
        }

        try {
            await this.courseService.deleteCourseById(id);
            return { status: HttpStatus.OK, message: 'Curso eliminado correctamente' };
        } catch (error) {
            throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}