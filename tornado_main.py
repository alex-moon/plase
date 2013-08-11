#!/usr/bin/env python

from tornado.options import options, define
import django.core.handlers.wsgi
import tornado.websocket
import tornado.wsgi
import tornado.httpserver
import os
import json

from client import PikaClient

define('port', type=int, default=81)


class PollHandler(tornado.websocket.WebSocketHandler):
    def open(self, *args, **kwargs):
        self.application.pc.add_event_listener(self)

    def on_message(self, message):
        # simple echo so we know stuff's working
        self.write_message(json.dumps({'confirm_message': message}))

        # same thing but through RabbitMQ
        # self.application.pc.channel.basic_publish(exchange='', routing_key='plase', body=json.dumps({
        #     'action': 'test_echo',
        #     'message': message,
        # }))

    def on_close(self):
        self.application.pc.remove_event_listener(self)


def main():
    os.environ['PYTHONPATH'] = '.'
    os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

    wsgi_app = tornado.wsgi.WSGIContainer(django.core.handlers.wsgi.WSGIHandler())
    tornado_app = tornado.web.Application([
        ('/poll/', PollHandler),
        ('.*', tornado.web.FallbackHandler, dict(fallback=wsgi_app)),
    ])

    tornado_loop = tornado.ioloop.IOLoop.instance()

    pc = PikaClient(tornado_loop)
    tornado_app.pc = pc
    tornado_app.pc.connect()  # @todo: better here might be tornado_loop.add_timeout(500, tornado_app.pc.connect)

    server = tornado.httpserver.HTTPServer(tornado_app)
    server.listen(options.port)
    tornado_loop.start()

if __name__ == '__main__':
    main()
