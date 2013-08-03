#!/usr/bin/env bash
export PATH=/opt/google/appengine/:$PATH
dev_appserver.py /var/www/plase/ --log_level=debug --datastore_path=tmp/data --skip_sdk_update_check
