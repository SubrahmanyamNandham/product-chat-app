import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException, Error)
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: WsException | Error, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const message =
      exception instanceof WsException ? exception.getError() : exception.message;
    client.emit('error', { message });
  }
}
