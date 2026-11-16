import type { Logger } from '@archi-code/ddd/application';
import { Http } from '../../../../platform/http/http';
import type { HttpRequest, HttpResponse } from '../../../../platform/http/http';
import type { CancelEnrollment } from '../../application/cancel-enrollment/cancel-enrollment';
import type { CompleteEnrollment } from '../../application/complete-enrollment/complete-enrollment';
import type { EnrollStudent } from '../../application/enroll-student/enroll-student';
import type { MyEnrollments } from '../../application/my-enrollments/my-enrollments';
import type { OpenCourses } from '../../application/open-catalog/open-courses';

export class EnrollmentsController {
  private readonly http: Http;

  constructor(
    private readonly enrollStudent: EnrollStudent,
    private readonly cancelEnrollment: CancelEnrollment,
    private readonly completeEnrollment: CompleteEnrollment,
    private readonly openCourses: OpenCourses,
    private readonly myEnrollments: MyEnrollments,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  enroll(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const actorId = request.auth?.userId;
      if (actorId === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the course to enroll in as a JSON object');
      }
      const id = await this.enrollStudent.execute({ actorId, courseId: body.courseId as string });
      return { status: 201, body: { id } };
    });
  }

  cancel(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const actorId = request.auth?.userId;
      if (actorId === undefined) {
        return this.http.unauthenticated();
      }
      await this.cancelEnrollment.execute({
        actorId,
        enrollmentId: request.params?.enrollmentId as string,
      });
      return { status: 204 };
    });
  }

  complete(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      await this.completeEnrollment.execute({
        actorRole: role,
        enrollmentId: request.params?.enrollmentId as string,
      });
      return { status: 204 };
    });
  }

  openCatalog(): Promise<HttpResponse> {
    return this.http.respond(async () => ({ status: 200, body: await this.openCourses.open() }));
  }

  mine(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const actorId = request.auth?.userId;
      if (actorId === undefined) {
        return this.http.unauthenticated();
      }
      return { status: 200, body: await this.myEnrollments.ofStudent(actorId) };
    });
  }
}
