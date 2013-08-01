#!/usr/bin/env bash

dev_appserver.py /var/www/plase/ --log_level=debug --datastore_path=tmp/data --skip_sdk_update_check
