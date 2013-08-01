#!/usr/bin/env python
import os
import sys

from lib.environ import setup_environ
setup_environ()

# Don't allow `runserver` or `shell`

if 'runserver' in sys.argv:
    # TODO: warn, but then run serve here as a subprocess?
    print "You should serve your local instance with dev_appserver. See `serve.py`"
    sys.exit(0)


if 'shell' in sys.argv:
    # TODO: warn, but then run `shell.py` as a subprocess?
    print "See `shell.py` for a shell that works with the local data and sets up the right stubs"
    sys.exit(0)

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
