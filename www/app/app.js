﻿// script.js
var domain = 'http://mx.isra-net.co.il/~moridimt/';
//var domain = 'http://a-report.co.il/';

/*
document.addEventListener('deviceready', function() {
    angular.bootstrap(document, ['app']);
}, false);
*/
var app = angular.module('app', ['ngRoute', 'ngAnimate', 'ngMaterial', 'angucomplete-alt', 'multipleDatePicker', 'ngMobile']);

app.run(function($http, dataShare) {
    var id = window.localStorage.getItem("id");
    $http.jsonp(domain + 'login.php?callback=JSON_CALLBACK&id=' + id)
        .success(function (data) {
            dataShare.set(data);
            if (id != null) {
                try {
                    window.plugins.OneSignal.init("70874495-6a25-4a03-a337-f24d0ba3480c",
                        {googleProjectNumber: "656959786426"},
                        dataShare.notificationOpenedCallback);
                    window.plugins.OneSignal.enableInAppAlertNotification(true);
                    window.plugins.OneSignal.sendTag("id", id);
                }
                catch (err) {
                }
            }
        });
});


// configure our routes
app.config(function ($routeProvider) {
    $routeProvider

        .when('/', {
            templateUrl: 'pages/home.html',
            controller: 'mainController'
        })

        .when('/login', {
            templateUrl: 'pages/login.html',
            controller: 'loginController'
        })

        .when('/message', {
            templateUrl: 'pages/message.html',
            controller: 'messageController'
        })

        .when('/status', {
            templateUrl: 'pages/status.html',
            controller: 'statusController'
        })

        .when('/report', {
            templateUrl: 'pages/report.html',
            controller: 'statusController'
        })

        .when('/statusList', {
            templateUrl: 'pages/statusList.html',
            controller: 'statusListController'
        })

        .when('/permissions', {
            templateUrl: 'pages/permissions.html',
            controller: 'permissionsController'
        })

        .when('/futureReport', {
            templateUrl: 'pages/futureReport.html',
            controller: 'statusController'
        })

        .when('/futureStatus', {
            templateUrl: 'pages/futureStatus.html',
            controller: 'statusController'
        })

        .when('/tracking', {
            templateUrl: 'pages/tracking.html',
            controller: 'trackingController'
        })

        .when('/reportAdmin', {
            templateUrl: 'pages/reportAdmin.html',
            controller: 'adminController'
        })

        .when('/users', {
            templateUrl: 'pages/users.html',
            controller: 'adminController'
        })

        .when('/messageAdmin', {
            templateUrl: 'pages/messageAdmin.html',
            controller: 'adminController'
        })

});

app.config(function ($mdThemingProvider) {
    $mdThemingProvider
        .theme('default')
        .primaryPalette('deep-orange') //#ff5722
        .accentPalette('pink')
        .warnPalette('red')
        .backgroundPalette('blue-grey')
});

app.factory('dataShare', function ($http, $location, $timeout, $window) {
    var service = {};
    var pagePromise = null;
    service.data = null;
    service.settings = null;
    service.reportedPhone = null;

    service.set = function (data) {
        this.data = data;
        if (this.data.hasOwnProperty("settings")) this.settings = this.data.settings;
    };
    service.get = function () {
        return this.data;
    };

    service.getSettings = function () {
        return this.settings;
    };

    service.setSettings = function(key1, val1) {
        this.settings[key1] = val1;
    }

    service.getZoomFactor = function() {
        return Math.min(window.innerWidth/3.75, window.innerHeight/6.67);
    }

    service.changePage = function (data, path) {
        this.mainPage = false;
        this.set(data);
        if (path == null) {
            if (data.id == -1) path = 'login';
            else {
                if (this.settings.message_status==2) this.action('message', 'message');
                else {
                    this.mainPage = true;
                    if (data.status == -1) path = 'report';
                    else path = 'status';
                }
            }
        }
        $location.path(path);
        $timeout.cancel(pagePromise);
        pagePromise = $timeout(function () {
            this.mainPage = false;
            $location.path('');
        }, 5 * 60 * 1000);
    };

    service.action = function (oper, page, params) {
        params = (params==null)?'':'&'+Object.keys(params).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]) }).join('&');
        url = domain + page + '.php?callback=JSON_CALLBACK&id=' + this.get().id + params;
        service.setLoading(true);
        $http.jsonp(url)
        .success(function (data) {
            service.setLoading(false);
            if (oper=='main') service.changePage(data);
            else service.changePage(data, oper);
        });
    };

    service.notificationOpenedCallback = function(jsonData) {
    };

    var _loading = false;
    var wp = null;
    service.setLoading = function (start) {
        if (start) {
            wp = $timeout(function () {
                _loading = true;
            }, 300);
        }
        else {
            $timeout.cancel(wp);
            _loading = false;
        }
    }

    service.getLoading = function () {
        return _loading;
    }

    return service;
});

app.controller('mainController', function ($scope, $rootScope, $http, $window, $timeout, dataShare) {
    $scope.dataShare = dataShare;
    $scope.zoomFactor = dataShare.getZoomFactor();

    $scope.enter = function (admin) {
        dataShare.setLoading(true);
        $http.jsonp(domain + 'login.php?callback=JSON_CALLBACK&id='+dataShare.get().id)
            .success(function (data) {
                dataShare.setLoading(false);
                if (data.ver <= 1.4) {
                    path=(admin)?'reportAdmin':null;
                    dataShare.changePage(data, path);
                } else {
                    $scope.versionUpdate = true;
                }
            });
    };

    $scope.logout = function () {
        $http.jsonp(domain+'login.php?callback=JSON_CALLBACK&id='+dataShare.get().id+'delete')
            .success(function (data) {
                window.localStorage.removeItem("id");
                dataShare.set(data);
            });
    };
});

app.controller('loginController', function ($scope, $http, $mdDialog, dataShare) {
    $scope.dataShare = dataShare;
    $scope.loginState = 'code';
    $scope.message = 'הקש את קוד המשתמש לכניסה';
    $scope.value = '';
    $scope.index = 0;
    $scope.fills = [{ value: true }, { value: true }, { value: true }, { value: true }, { value: true }];

    $scope.press = function (val) {
        if (val == 'r') {
            if ($scope.index > 0) {
                $scope.index--;
                $scope.value = $scope.value.slice(0, -1);
            }
            else return;
        }
        else {
            $scope.value += val;
        }

        if ($scope.loginState == 'code') {
            $scope.fills[$scope.index].value = !($scope.fills[$scope.index].value);
        }

        if (val != 'r') $scope.index++;

        if ($scope.loginState == 'code' && $scope.index == 5) {
            dataShare.setLoading(true);
            $http.jsonp(domain+'login.php?callback=JSON_CALLBACK&id=' + $scope.value)
            .success(function (data) {
                dataShare.setLoading(false);
                refresh();
                if (data.id != -1) {
                    window.localStorage.setItem("id", data.id);
                    dataShare.changePage(data);
                }
            });

        } else if ($scope.loginState == 'phone' && $scope.index == 10) {
            dataShare.setLoading(true);
            $http.jsonp(domain+'send_code.php?callback=JSON_CALLBACK&p_id=' + $scope.value)
            .success(function (data) {
                dataShare.setLoading(false);
                $scope.sendCodeScreen = true;
                $scope.loginCodeResponse = (data.status) ? 'found' : 'not-found';
            });
        }
    };

    $scope.sendCode = function () {
        refresh();
        $scope.loginState = ($scope.loginState == 'code') ? 'phone' : 'code';
        $scope.message = ($scope.loginState == 'code') ? 'הקש את קוד המשתמש לכניסה' : 'הכנס מספר ווטסאפ למשלוח קוד';
    };

    refresh = function () {
        $scope.value = '';
        $scope.index = 0;
        $scope.fills = [{ value: true }, { value: true }, { value: true }, { value: true }, { value: true }];
    };
});

app.controller('messageController', function ($scope, $http, $location, $timeout, dataShare) {
    $scope.dataShare = dataShare;
    if (dataShare.get()==null) $location.path('');

    $scope.confirm = function () {
        dataShare.setLoading(true);
        $http.jsonp(domain + 'message.php?callback=JSON_CALLBACK&op=confirm&id=' + dataShare.get().id)
            .success(function (data) {
                dataShare.setLoading(false);
                dataShare.action('main', 'login');
            });
    };
});

app.controller('statusController', function ($scope, $http, $location, dataShare, $timeout) {

    $scope.dataShare = dataShare;
    if (dataShare.get()==null || dataShare.get().id==null) $location.path('');

    $scope.reportPage='main';
    $scope.info_image = 'report_info';

    $scope.myStyle = [null,null,null,null,null,null,null,null,null,null,null,null];

    if ('report' in dataShare.get()) {
        $timeout(function () {
            $scope.status_savedMsg = true;
            $timeout(function () {
                $scope.status_savedMsg = false;
            }, 5 * 1000);
        }, 250);
    }

    try {
        if (data.id!='') {
            window.plugins.OneSignal.init("b329644d-2d8d-44cf-98cb-3dbe7a788610",
                {googleProjectNumber: "682594015864"},
                dataShare.notificationOpenedCallback);
            window.plugins.OneSignal.enableInAppAlertNotification(true);
            window.plugins.OneSignal.sendTag("id", data.id);
        }
    }
    catch (err) {}


    $scope.keyEvent = function(keyEvent, info) {
        if (keyEvent.which === 13) $scope.InfoPopupCB(info);
    };

    var isFuture = false;
    var statusSelected = 1;
    $scope.report = function (status) {
        if (status==null) isFuture=true;
        else statusSelected = status;

        if (statusSelected==4 || statusSelected==11) {
            $scope.info_image = (statusSelected == 4) ? 'report_info' : 'report_info2';
            $scope.report_infoMsg = true;
        }
        else if (isFuture) futureReport(statusSelected);
        else dayReport(statusSelected);
    };

    $scope.cancelReport = function() {
        dayReport(-1);
    };

    $scope.cancelTask = function(taskId) {
        dataShare.setLoading(true);
        $http.jsonp(domain+'future_tasks.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&task_id=' + taskId + '&oper=-1')
            .success(function (data) {
                dataShare.setLoading(false);
                dataShare.set(data);
            });
    };

    $scope.InfoPopupCB = function (info) {
        if ($scope.info_image=='report_error') $scope.report_infoMsg = false;
        else if (info!=null) {
            if (isFuture) futureReport(statusSelected, info);
            else dayReport(statusSelected, info);
        }
    };

    var reportSent = false;
    var dayReport = function (status, info) {
        if (reportSent) return;
        else reportSent = true;

        if (info==null) info='';
        if (status>=0) $scope.myStyle[status] = { 'background-color': '#80be40' };

        dataShare.setLoading(true);
        phone = dataShare.get()["phone"];
        phoneParam = (phone!=null)?'&phone='+phone:'';
        $http.jsonp(domain+'report.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&day=' + dataShare.get().day + '&oper=' + status + '&info='+info + phoneParam)
            .success(function (data) {
                dataShare.setLoading(false);
                if (phone!=null) dataShare.action('statusList', 'notifications');
                else dataShare.changePage(data);
            });
    };

    var futureReport = function (status, info) {
        if (info==null) info='';

        var start_day = moment($scope.report_dates.start_day).format('YYYY-MM-DD');
        var end_day   = moment($scope.report_dates.end_day).format('YYYY-MM-DD');
        dataShare.setLoading(true);
        $http.jsonp(domain+'future_tasks.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&start_day=' + start_day + '&end_day=' + end_day + '&oper=' + status + '&info='+info)
            .success(function (data) {
                dataShare.setLoading(false);
                if (data.status=='duplicated') {
                    $scope.info_image = 'report_error';
                    $scope.report_infoMsg = true;
                }
                else dataShare.action('futureStatus', 'future_tasks');
            });
    };

    $scope.today = new Date(dataShare.get().day);
    var tomorrow = new Date();
    tomorrow.setDate($scope.today.getDate() + 1);
    $scope.report_dates = { start_day: tomorrow, end_day: tomorrow };
    $scope.display1 = $scope.report_dates.start_day;
    if ($scope.report_dates.end_date!=null) $scope.display1 += " - " + $scope.report_dates.end_date;

    $scope.dateChanged = function () {
        if ($scope.report_dates.end_day < $scope.report_dates.start_day)
            $scope.report_dates.end_day = $scope.report_dates.start_day;
    };

    $scope.report2BtnStyle = [null, { 'background-color': '#80be40' }, null, null, null, null, null, null, null, null, null, null];
    $scope.changeFutureStatus = function (status) {
        $scope.report2BtnStyle[statusSelected] = { 'background-color': '#234a7d' };
        $scope.report2BtnStyle[status] = { 'background-color': '#80be40' };
        statusSelected = status;
    };

    $scope.highlightDays = [{date: moment($scope.report_dates.start_day), css: 'picker-selected', selectable: true,title: ''}];
    $scope.dateDisplay = moment($scope.report_dates.start_day).format('D/M');
    $scope.daySelected = function(event, date) {
        event.preventDefault(); // prevent the select to happen
        //reproduce the standard behavior
        if ($scope.report_dates.start_day==null || $scope.report_dates.end_day!=null) {
            if (date>=$scope.today) {
                $scope.report_dates.end_day=null;
                $scope.report_dates.start_day = date;
                $scope.highlightDays = [{date: moment(date), css: 'picker-selected', selectable: true,title: ''}];
            }
            else {
                $scope.highlightDays = [];
                $scope.report_dates.start_day = $scope.report_dates.end_day = null;
            }
        } else {
            if (date > $scope.report_dates.start_day) {
                $scope.report_dates.end_day = date;
                var d = new Date($scope.report_dates.start_day);
                while (d < $scope.report_dates.end_day) {
                    d.setDate(d.getDate() + 1);
                    $scope.highlightDays.push({
                        date: moment(new Date(d)),
                        css: 'picker-selected',
                        selectable: true,
                        title: ''
                    });
                }
            }
            else {
                $scope.highlightDays = [];
                $scope.report_dates.start_day = $scope.report_dates.end_day = null;
            }
        }
    }

    $scope.calanderBack = function() {
        if ($scope.report_dates.start_day!=null) {
            $scope.dateDisplay = moment($scope.report_dates.start_day).format('D/M');
            if ($scope.report_dates.end_day == null) {
                $scope.report_dates.end_day = $scope.report_dates.start_day
            } else if ($scope.report_dates.end_day != $scope.report_dates.start_day) {
                $scope.dateDisplay += " - " + moment($scope.report_dates.end_day).format('D/M');
            }
            $scope.showCalander=false;
        }
    }

});

app.controller('statusListController', function ($scope, $http, $location, dataShare) {
    $scope.dataShare = dataShare;
    if (dataShare.get()==null) $location.path('');

    $scope.removeUser = function (user) {
        $http.jsonp(domain+'notifications.php?callback=JSON_CALLBACK&op=del&id=' + dataShare.get().id+'&user='+user)
            .success(function (data) {
                dataShare.set(data);
            });
    };

    $scope.addUser = function (user) {
        if (user!=null) {
            $http.jsonp(domain + 'notifications.php?callback=JSON_CALLBACK&op=req&id=' + dataShare.get().id + '&user=' + user.originalObject.name)
                .success(function (data) {
                    dataShare.set(data);
                    $scope.$broadcast('angucomplete-alt:clearInput', 'statusList-AddUser');
                });
        }
    };

    $scope.report = function(name, phone) {
        if (dataShare.getSettings()['manager']) {
            dataShare.action('report', 'report_as', {name: name, phone: phone});
        }
    }
});

app.controller('permissionsController', function ($scope, $http, $timeout, dataShare) {
    $scope.dataShare = dataShare;
    var switchEnable = true;
    var permissions = {};

    dataShare.setSettings('permission_request', 0);

    $scope.switchPermission = function (user) {
        if (switchEnable) {
            switchEnable = false;
            $timeout(function () { switchEnable = true; }, 500);
            user.status = !user.status;
            if (user.nId in permissions) delete permissions[user.nId];
            else permissions[user.nId] = user.status;
        }
    };

    $scope.closePermissions = function (save) {
        if (save) {
            for (nId in permissions) {
                $http.jsonp(domain + 'permissions.php?callback=JSON_CALLBACK&op=change&id=' + dataShare.get().id + '&nId=' + nId + '&status=' + permissions[nId]).success(function (data) { });
            }
        }
        dataShare.action('statusList', 'notifications');
    };
});

app.controller('trackingController', function ($scope, $http, $timeout, dataShare) {
    $scope.dataShare = dataShare;
    $scope.dayInfo = null;

    var eventsColors = ['green', 'purple', 'red', 'purple', 'green', 'green', 'purple', 'red', 'red', 'red', 'purple', 'orange', 'regular'];
    var historyCallback = function (data) {
        $scope.highlightDays = [];
        for (var i = 0; i < data.reported.length; i++) {
            $scope.highlightDays.push({
                date: data.reported[i].day,
                css: eventsColors[data.reported[i].status],
                selectable: false,
                title: ''
            });
        }
    };

    $http.jsonp(domain + 'history.php?callback=JSON_CALLBACK&id=' + dataShare.get().id).success(historyCallback);

    var wp = null;
    $scope.logMonthChanged = function (newMonth, oldMonth) {
        $scope.infoShow = false;
        $timeout.cancel(wp);
        wp = $timeout(function () {
            $http.jsonp(domain + 'history.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&month=' + newMonth.format('YYYY-MM')).success(historyCallback);
        }, 350);
    };

    var loadDayInfo = function () {
        $http.jsonp(domain + 'history.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&day=' + selectedDay.format('YYYY-MM-DD'))
            .success(function (data) {
                $scope.infoBg = eventsColors[data.status];
                $scope.dayInfo = data;
                $scope.addAttach = false;
                $scope.infoMessage = '';
                if (eventsColors[data.status] == 'red') {
                    if (data.attach) $scope.infoMessage = 'הצג אישור';
                    else $scope.infoMessage = '[צרף אישור]';
                } else {
                    $scope.infoMessage = (data.info != '') ? data.info : 'אין הערות';
                }
            });
    }

    var selectedDay = null;
    $scope.daySelected = function (event, date) {
        event.preventDefault(); // prevent the select to happen
        selectedDay = date;
        loadDayInfo();
        $scope.xinfo = (event.x - 42.5) + "px";
        $scope.yinfo = (event.y - 42.5) + "px";
        $scope.infoShow = true;
    };

    $scope.infoSelected = function () {
        if ($scope.dayInfo.attach) {
            var url = domain + 'attachments.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&day=' + selectedDay.format('YYYY-MM-DD');
            window.open(url, '_system', 'location=no');
        } else if (eventsColors[$scope.dayInfo.status] == 'red') {
            var url = domain + 'upload.html#/' + dataShare.get().id + '/' + selectedDay.format('YYYY-MM-DD');
            window.open(url, '_system', 'location=no');
            $scope.closeInfo();
        }
    };

    $scope.closeInfo = function () {
        $scope.infoShow = false;
    };

    $scope.deleteAttachment = function () {
        $http.jsonp(domain + 'report.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&day=' + selectedDay.format('YYYY-MM-DD') + '&attach=&oper=0')
            .success(function (data) {
                loadDayInfo();
            });
    }
});

app.controller('adminController', function ($scope, $http, $timeout, dataShare) {
    $scope.dataShare = dataShare;
    var switchEnable = true;

    $scope.qr_op = 'status';
    $scope.switchOp = function (id) {
        if (switchEnable) {
            switchEnable = false;
            $timeout(function () {
                switchEnable = true;
            }, 500);
            dataShare.setLoading(true)
            $http.jsonp(domain + 'lock.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&op=' + !dataShare.get().lock)
                .success(function (data) {
                    dataShare.setLoading(false);
                    dataShare.set(data);
                });
        }
    };

    $scope.toggleSelection = function toggleSelection(phone) {
        var idx = $scope.selection.indexOf(phone);
        if (idx > -1) $scope.selection.splice(idx, 1);
        else $scope.selection.push(phone);
    };

    var refresh = function () {
        $scope.user_name = '';
        $scope.user_phone = '';
        $scope.user_isManager = false;
        $scope.selection = [];
    };
    refresh();
    $scope.editUsers = function () {
        var newUser = '';
        var deletedPhones = '';
        if ($scope.user_name != '' && $scope.user_phone != '') {
            newUser = '&name=' + $scope.user_name + '&phone=' + $scope.user_phone + '&manager=' + $scope.user_isManager;
        }
        if ($scope.selection.length > 0) {
            deletedPhones = '&deleted=';
            for (index = 0; index < $scope.selection.length; ++index) deletedPhones += $scope.selection[index] + ';';
        }

        if (newUser != '' || deletedPhones != '') {
            dataShare.setLoading(true);
            $http.jsonp(domain + 'users.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + newUser + deletedPhones)
                .success(function (data) {
                    dataShare.setLoading(false);
                    dataShare.set(data);
                    refresh();
                });
        }
    };

    $scope.systemMessage = dataShare.get().message;
    $scope.editMessage = function () {
        if ($scope.systemMessage != '') {
            dataShare.setLoading(true);
            $http.jsonp(domain + 'message.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&op=new&msg=' + encodeURIComponent($scope.systemMessage))
                .success(function (data) {
                    dataShare.setLoading(false);
                    dataShare.set(data);
                });
        }
    };

    $scope.resetReaders = function () {
        dataShare.setLoading(true);
        $http.jsonp(domain + 'message.php?callback=JSON_CALLBACK&id=' + dataShare.get().id + '&op=reset')
            .success(function (data) {
                dataShare.setLoading(false);
                dataShare.set(data);
            });
    }

});

angular.module('app').config(function ($mdDateLocaleProvider) {
    $mdDateLocaleProvider.formatDate = function (date) {
        return moment(date).format('D/M/YYYY');
    };
});

/*
 app.controller('settingsController', function ($scope, $http, $location, dataShare) {
 $scope.settingsPage='main';
 $scope.dataShare = dataShare;
 $scope.loginData = dataShare.get();
 $scope.settingsData = dataShare.getSettings();
 $scope.mainPage = dataShare.mainPage;

 $http.jsonp(domain+'notifications.php?callback=JSON_CALLBACK&id=' + $scope.loginData.id)
 .success(function (data) {
 $scope.reportedUsers = data;
 });

 var changeSetting = false;
 $scope.changeSettings = function (setting) {
 if (changeSetting) return;
 changeSetting = true;
 key = Object.keys($scope.loginData.settings)[setting];
 $scope.loginData.settings[key] = !($scope.loginData.settings[key]);
 url = domain+'settings.php?callback=JSON_CALLBACK&id=' + $scope.loginData.id + '&key=' + key + '&value=' + $scope.loginData.settings[key];
 $http.jsonp(url)
 .success(function () {
 setTimeout(function () {
 changeSetting = false;
 }, 500);
 });
 }

 $scope.removeUser = function (user) {
 $http.jsonp(domain+'notifications.php?callback=JSON_CALLBACK&op=del&id=' + $scope.loginData.id+'&user='+user)
 .success(function (data) {
 $scope.reportedUsers = data;
 });
 }

 $scope.addUser = function (user) {
 $http.jsonp(domain + 'notifications.php?callback=JSON_CALLBACK&op=req&id=' + $scope.loginData.id + '&user=' + user.originalObject.name)
 .success(function (data) {
 $scope.reportedUsers = data;
 $scope.$broadcast('angucomplete-alt:clearInput', 'settings-AddUser');

 });
 }
 });
 */