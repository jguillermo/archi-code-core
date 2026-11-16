import type { Logger } from '@archi-code/ddd/application';
import { Http } from '../../../../platform/http/http';
import type { HttpRequest, HttpResponse } from '../../../../platform/http/http';
import type { CourseViews } from '../../application/course-views/course-views';
import type { CreateCourse } from '../../application/create-course/create-course';
import type { LessonData } from '../../application/create-course/lesson-data';
import type { MoneyData } from '../../application/create-course/money-data';
import type { DiscountCheapCourses } from '../../application/discount-cheap-courses/discount-cheap-courses';
import type { PublishCourse } from '../../application/publish-course/publish-course';
import type { RenameLesson } from '../../application/rename-lesson/rename-lesson';
import type { RetireCourse } from '../../application/retire-course/retire-course';

export interface CoursesUseCases {
  createCourse: CreateCourse;
  renameLesson: RenameLesson;
  publishCourse: PublishCourse;
  retireCourse: RetireCourse;
  discountCheapCourses: DiscountCheapCourses;
}

export class CoursesController {
  private readonly http: Http;

  constructor(
    private readonly useCases: CoursesUseCases,
    private readonly courseViews: CourseViews,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  create(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null || !Array.isArray(body.lessons)) {
        return this.http.badRequest('Send the course as a JSON object with a list of lessons');
      }
      const id = await this.useCases.createCourse.execute({
        actorRole: role,
        courseId: body.courseId as string,
        title: body.title as string,
        price: body.price as MoneyData,
        lessons: body.lessons as LessonData[],
      });
      return { status: 201, body: { id } };
    });
  }

  renameLesson(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the new title as a JSON object');
      }
      await this.useCases.renameLesson.execute({
        actorRole: role,
        courseId: request.params?.courseId as string,
        lessonNumber: Number(request.params?.lessonNumber),
        title: body.title as string,
      });
      return { status: 204 };
    });
  }

  publish(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      await this.useCases.publishCourse.execute({
        actorRole: role,
        courseId: request.params?.courseId as string,
      });
      return { status: 204 };
    });
  }

  retire(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      await this.useCases.retireCourse.execute({
        actorRole: role,
        courseId: request.params?.courseId as string,
      });
      return { status: 204 };
    });
  }

  discountCheapCourses(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the price limit as a JSON object');
      }
      await this.useCases.discountCheapCourses.execute({
        actorRole: role,
        below: body.below as MoneyData,
      });
      return { status: 204 };
    });
  }

  detail(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const view = await this.courseViews.byId(request.params?.courseId as string);
      if (view === null) {
        return this.http.notFound('There is no course with that id');
      }
      return { status: 200, body: view };
    });
  }

  catalog(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const amount = Number(request.query?.belowAmount);
      const currency = request.query?.belowCurrency;
      if (!Number.isFinite(amount) || currency === undefined) {
        return this.http.badRequest('Send belowAmount (cents) and belowCurrency in the query');
      }
      return {
        status: 200,
        body: await this.courseViews.publishedCheaperThan({ amount, currency }),
      };
    });
  }
}
