<?php
$auth = new Auth();
$auth->logout();
header('Location: ' . SITE_URL . '/');
exit;
