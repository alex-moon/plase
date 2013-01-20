from pika.adapters.tornado_connection import TornadoConnection
import json

class PikaClient(object):
    def __init__(self, io_loop):
        self.io_loop = io_loop

        self.connected = False
        self.connecting = False
        self.connection = None
        self.channel = None

        self.event_listeners = set([])

    def connect(self):
        if self.connecting:
            return

        self.connecting = True

        self.connection = TornadoConnection(on_open_callback=self.on_connected)
        self.connection.add_on_close_callback(self.on_closed)

    def on_connected(self, connection):
        self.connected = True
        self.connection = connection
        self.connection.channel(self.on_channel_open)

    def on_channel_open(self, channel):
        self.channel = channel
        channel.queue_declare(queue="plase", durable=True, callback=self.on_queue_declared)

    def on_queue_declared(self, frame):
        self.channel.basic_consume(self.on_message, queue='plase')

    def on_closed(self, connection):
        self.io_loop.stop()

    def on_message(self, channel, method, header, body):
        self.notify_listeners(body)

    def notify_listeners(self, event_obj):
        event_json = json.dumps(event_obj)

        for listener in self.event_listeners:
            listener.write_message(event_json)

    def add_event_listener(self, listener):
        self.event_listeners.add(listener)

    def remove_event_listener(self, listener):
        try:
            self.event_listeners.remove(listener)
        except KeyError:
            pass
