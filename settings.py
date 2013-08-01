# Django settings for plase project.

import os
import sys

APPENGINE_PRODUCTION = os.getenv('APPENGINE_PRODUCTION')

HTTP_HOST = os.environ.get('HTTP_HOST')

PROJDIR = os.path.abspath(os.path.dirname(__file__))

# DEBUG = not APPENGINE_PRODUCTION
DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    ('Alex Moon', 'alex.moon@tangentlabs.co.uk')
)

MANAGERS = ADMINS

# A custom cache backend using AppEngine's memcached
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'TIMEOUT': 0,
    }
}

# If you are using CloudSQL, you can comment out the next line
TEST_RUNNER = 'lib.testrunnernodb.TestRunnerNoDb'

SESSION_ENGINE = "appengine_sessions.backends.cached_db"

# Uncomment these DB definitions to use Cloud SQL.
# See: https://developers.google.com/cloud-sql/docs/django#development-settings
#import os
#if (os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine') or
#    os.getenv('SETTINGS_MODE') == 'prod'):
#    # Running on production App Engine, so use a Google Cloud SQL database.
#    DATABASES = {
#        'default': {
#            'ENGINE': 'google.appengine.ext.django.backends.rdbms',
#            'INSTANCE': 'my_project:instance1',
#            'NAME': 'my_db',
#            }
#        }
#else:
#    # Running in development, so use a local MySQL database.
#    DATABASES = {
#         'default': {
#             #'ENGINE': 'django.db.backends.postgresql_psycopg2',
#             'ENGINE':  'django.contrib.gis.db.backends.postgis',
#             'NAME': 'plase',
#             'USER': 'plase',
#             'PASSWORD': 'plase',
#             'HOST': 'localhost',
#             'PORT': '',
#         }
#    }


TIME_ZONE = 'Europe/London'
LANGUAGE_CODE = 'en-uk'

SITE_ID = 1
USE_I18N = False
USE_L10N = True
USE_TZ = True
MEDIA_ROOT = '/var/www/plase/media/'
MEDIA_URL = '/media/'
STATIC_ROOT = '/var/www/plase/_static/'
STATIC_URL = '/static/'
ADMIN_MEDIA_PREFIX = '/_static/admin/'
STATICFILES_DIRS = (
    '/var/www/plase/assets/',
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'waq4wjg7_ykae06ui#e3*2$+fjtk&amp;i82gr_d2zc@wq@2sr8jhe'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'wsgi.application'

TEMPLATE_DIRS = (
    '/var/www/plase/templates/'
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'django.contrib.gis',
    # 'django_extensions',
    'backbone',
    'plays',
    'appengine_sessions',
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}
