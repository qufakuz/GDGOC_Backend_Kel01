import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { ApiStatusEnum, ApiStatusMessages } from 'src/enums/api-status.enum';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : ApiStatusEnum.INTERNAL_SERVER_ERROR;

    const message = ApiStatusMessages[status];
    const error =
      exception instanceof HttpException
        ? exception.getResponse()
        : [{ message: 'Unexpected error occurred' }];

    console.log(exception);

    response.status(status).json({
      status: false,
      message,
      error,
    });
  }
}
