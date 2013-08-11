import os
import sys
import json
import logging
sys.path.extend(['lib'])

os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

os.environ['APPENGINE_PRODUCTION'] = \
    os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine') or\
    os.getenv('SETTINGS_MODE') == 'prod'

import django
import django.core.signals
import django.dispatch
import django.db

if not os.getenv('APPENGINE_PRODUCTION'):
    logging.info('Development django: %s' % django.__file__)
    logging.info(django.get_version())


# Log exceptions
def log_exception(*args, **kwds):
    logging.exception('Exception in request:')

django.dispatch.Signal.connect(
    django.core.signals.got_request_exception, log_exception)



"""
# was originally something like the following:
import tornado.websocket
import tornado.wsgi
import tornado.httpserver

from google.appengine.api import taskqueue


class TaskHandler(object):
    listeners = set([])

    def add_listener(self, listener):
        self.listeners.add(listener)

    def handle_tasks(self):
        queue = taskqueue.Queue('plase')
        tasks = queue.lease_tasks(1000, 1000)
        for task in tasks:
            self.notify_listeners(task)
        queue.delete_tasks(tasks)

    def notify_listeners(self, json_obj):
        for listener in self.listeners:
            listener.write_message(json_obj)

    def remove_listener(self, listener):
        try:
            self.listeners.remove(listener)
        except KeyError:
            pass


class PollHandler(tornado.websocket.WebSocketHandler):
    def open(self, *args, **kwargs):
        logging.info('Socket opened')
        self.application.task_handler.add_listener(self)

    def on_message(self, message):
        # simple echo so we know stuff's working
        self.write_message(json.dumps({'confirm_message': message}))

    def on_close(self):
        logging.info('Socket closed')
        self.application.task_handler.remove_listener(self)


def main():
    os.environ['PYTHONPATH'] = '.'
    os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

    wsgi_app = tornado.wsgi.WSGIContainer(django.core.handlers.wsgi.WSGIHandler())
    tornado_app = tornado.web.Application([
        ('/poll/', PollHandler),
        ('.*', tornado.web.FallbackHandler, dict(fallback=wsgi_app)),
    ])

    tornado_loop = tornado.ioloop.IOLoop.instance()
    task_handler = TaskHandler()
    task_handler_callback = tornado.ioloop.PeriodCallback(task_handler.handle_tasks, 1000, io_loop=tornado_loop)

    tornado_app.task_handler = task_handler
    server = tornado.httpserver.HTTPServer(tornado_app)
    server.listen()

    task_handler_callback.start()
    tornado_loop.start()

if __name__ == '__main__':
    main()
"""