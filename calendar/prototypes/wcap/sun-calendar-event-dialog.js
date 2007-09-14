/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Sun Microsystems code.
 *
 * The Initial Developer of the Original Code is Sun Microsystems.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Michael Buettner <michael.buettner@sun.com>
 *   Philipp Kewisch <mozilla@kewis.ch>
 *   Martin Schroeder <mschroeder@mozilla.x-home.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// the following variables are constructed if the jsContext this file
// belongs to gets constructed. all those variables are meant to be accessed
// from within this file only.
var gStartTime = null;
var gEndTime = null;
var gItemDuration = null;
var gStartTimezone = null;
var gEndTimezone = null;
var gIsReadOnly = false;
var gUserID = null;
var gOrganizerID = null;
var gPrivacy = null;
var gURL = null;
var gPriority = 0;
var gDictCount = 0;
var gPrefs = null;
var gLastRepeatSelection = 0;
var gIgnoreUpdate = false;
var gShowTimeAs = null;
var gIsSunbird = false;

// update menu items that rely on focus
function goUpdateGlobalEditMenuItems() {
    goUpdateCommand('cmd_undo');
    goUpdateCommand('cmd_redo');
    goUpdateCommand('cmd_cut');
    goUpdateCommand('cmd_copy');
    goUpdateCommand('cmd_paste');
    goUpdateCommand('cmd_selectAll');
}

// update menu items that rely on the current selection
function goUpdateSelectEditMenuItems() {
    goUpdateCommand('cmd_cut');
    goUpdateCommand('cmd_copy');
    goUpdateCommand('cmd_delete');
    goUpdateCommand('cmd_selectAll');
}

// update menu items that relate to undo/redo
function goUpdateUndoEditMenuItems() {
    goUpdateCommand('cmd_undo');
    goUpdateCommand('cmd_redo');
}

// update menu items that depend on clipboard contents
function goUpdatePasteMenuItems() {
    goUpdateCommand('cmd_paste');
}

function onLoad() {
    // first of all retrieve the array of
    // arguments this window has been called with.
    var args = window.arguments[0];

    // The calling entity provides us with an object that is responsible
    // for recording details about the initiated modification. the 'finalize'
    // property is our hook in order to receive a notification in case the
    // operation needs to be terminated prematurely. This function will be
    // called if the calling entity needs to immediately terminate the pending
    // modification. In this case we serialize the item and close the window.
    if (args.job) {
        // keep this context...
        var self = this;

        // store the 'finalize'-functor in the provided job-object.
        args.job.finalize = function() {
            // store any pending modifications...
            self.onAccept();

            var item = window.calendarItem;

            // ...and close the window.
            window.close();

            return item;
        }
    }

    window.fbWrapper = args.fbWrapper;

    // the most important attribute we expect from the
    // arguments is the item we'll edit in the dialog.
    var item = args.calendarEvent;

    // new items should have a non-empty title.
    if (item.isMutable && (!item.title || item.title.length <= 0)) {
        item.title = calGetString("sun-calendar-event-dialog",
                                  isEvent(item) ? "newEvent" : "newTask");
    }

    window.onAcceptCallback = args.onOk;

    // we store the item in the window to be able
    // to access this from any location. please note
    // that the item is either an occurrence [proxy]
    // or the stand-alone item [single occurrence item].
    window.calendarItem = item;

    // we store the array of attendees in the window.
    // clone each existing attendee since we still suffer
    // from the 'lost x-properties'-bug.
    window.attendees = [];
    var attendees = item.getAttendees({});
    if (attendees && attendees.length) {
        for each (var attendee in attendees) {
            window.attendees.push(attendee.clone());
        }
    }

    // we store the organizer of the item in the window.
    // TODO: we clone the object since foreign X-props get lost
    // during the roundtrip. In order to detect whether or not
    // the item has been changed by the dialog we clone the organizer
    // in any case to get rid of the X-props.
    window.organizer = item.organizer && item.organizer.clone();

    window.isOccurrence = (item != item.parentItem);

    // we store the recurrence info in the window so it
    // can be accessed from any location. since the recurrence
    // info is a property of the parent item we need to check
    // whether or not this item is a proxy or a parent.
    var parentItem = item;
    if (parentItem.parentItem != parentItem) {
        parentItem = parentItem.parentItem;
    }
    window.recurrenceInfo = parentItem.recurrenceInfo;

    const kSUNBIRD_ID = "{718e30fb-e89b-41dd-9da7-e25a45638b28}";
    var appInfo = Cc["@mozilla.org/xre/app-info;1"]
                  .getService(Ci.nsIXULAppInfo);

    if (appInfo.ID == kSUNBIRD_ID) {
        gIsSunbird = true;
    }

    document.getElementById("sun-calendar-event-dialog").getButton("accept")
            .setAttribute("collapsed", "true");
    document.getElementById("sun-calendar-event-dialog").getButton("cancel")
            .setAttribute("collapsed", "true");
    document.getElementById("sun-calendar-event-dialog").getButton("cancel")
            .parentNode.setAttribute("collapsed", "true");

    var prefService = Cc["@mozilla.org/preferences-service;1"]
                      .getService(Ci.nsIPrefService);

    gPrefs = prefService.getBranch(null);

    loadDialog(window.calendarItem);

    opener.setCursor("auto");

    document.getElementById("item-title").focus();
    document.getElementById("item-title").select();
}

function onAccept() {
    dispose();
    onCommandSave();
    return true;
}

function onCommandCancel() {
    // find out if we should bring up the 'do you want to save?' question...
    var newItem = saveItem();
    var oldItem = window.calendarItem.clone();

    newItem.deleteProperty("DTSTAMP");
    oldItem.deleteProperty("DTSTAMP");

    // we need to guide the description text through the text-field since
    // newlines are getting converted which would indicate changes to the
    // text.
    setElementValue("item-description", oldItem.getProperty("DESCRIPTION"));
    setItemProperty(oldItem,
                    "DESCRIPTION",
                    getElementValue("item-description"));

    // compare old and new version of this item. we ask the item for its
    // representation as icalString in order to have some easily comparable
    // form we can work with.
    if (newItem.icalString == oldItem.icalString) {
        return true;
    }

    var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Ci.nsIPromptService);

    var promptTitle = calGetString("calendar",
                                   isEvent(window.calendarItem) ?
                                      "askSaveTitleEvent" :
                                      "askSaveTitleTask");
    var promptMessage = calGetString("calendar", "askSaveMessage");
    var buttonLabel1 = calGetString("calendar", "askSaveLabel1");
    var buttonLabel2 = calGetString("calendar", "askSaveLabel2");

    var flags = promptService.BUTTON_TITLE_IS_STRING *
                promptService.BUTTON_POS_0 +
                promptService.BUTTON_TITLE_CANCEL *
                promptService.BUTTON_POS_1 +
                promptService.BUTTON_TITLE_IS_STRING *
                promptService.BUTTON_POS_2;

    var choice = promptService.confirmEx(null,
                                         promptTitle,
                                         promptMessage,
                                         flags,
                                         buttonLabel1,
                                         null,
                                         buttonLabel2,
                                         null,
                                         {});
    switch (choice) {
        case 0:
            onCommandSave();
            return true;
        case 2:
            return true;
        default:
            return false;
    }
}

function onCancel() {
    var result = onCommandCancel();
    if (result == true) {
        dispose();
    }
    return result;
}

function timezoneString(aDate) {
    var fragments = aDate.split('/');
    var num = fragments.length;
    if (num <= 1) {
        return fragments[0];
    }
    return fragments[num-2] + '/'+fragments[num - 1];
}

function loadDialog(item) {
    setElementValue("item-title", item.title);
    setElementValue("item-location", item.getProperty("LOCATION"));

    loadDateTime(item);

    // add calendars to the calendar menulist
    var calendarList = document.getElementById("item-calendar");
    var calendars = getCalendarManager().getCalendars({});
    var calendarToUse = item.calendar || window.arguments[0].calendar
    var selectIndex = 0;
    for (var i in calendars) {
        var calendar = calendars[i];
        if (calendar == item.calendar ||
            calendar == window.arguments[0].calendar) {
            var menuitem = calendarList.appendItem(calendar.name, i);
            menuitem.calendar = calendar;
            if (calendarToUse) {
                if (calendarToUse.uri.equals(calendar.uri)) {
                    calendarList.selectedIndex = selectIndex;
                }
            }
        } else if (calendar && !calendar.readOnly) {
            var menuitem = calendarList.appendItem(calendar.name, i);
            menuitem.calendar = calendar;
            if (calendarToUse) {
                if (calendarToUse.uri.equals(calendar.uri)) {
                    calendarList.selectedIndex = selectIndex;
                }
            }
        }
        selectIndex++;
    }

    // no calendar attached to item
    // select first entry in calendar list as default
    if (!calendarToUse) {
        document.getElementById("item-calendar").selectedIndex = 0;
    }

    // Categories
    var categoriesString = getLocalizedPref("calendar.categories.names", "");
    var categoriesList = categoriesString.split(",");
    
    // When categoriesString is empty, split returns an array containing one
    // empty string, rather than an empty array. This results in an empty
    // menulist item with no corresponding category.
    if (categoriesList.length == 1 && !categoriesList[0].length) {
        categoriesList.pop();
    }

    // insert the category already in the menulist so it doesn't get lost
    var itemCategory = item.getProperty("CATEGORIES");
    if (itemCategory) {
        if (categoriesString.indexOf(itemCategory) == -1) {
            categoriesList[categoriesList.length] = itemCategory;
        }
    }
    categoriesList.sort();

    var oldMenulist = document.getElementById("item-categories");
    while (oldMenulist.hasChildNodes()) {
        oldMenulist.removeChild(oldMenulist.lastChild);
    }

    var categoryMenuList = document.getElementById("item-categories");
    var indexToSelect = 0;

    // Add a 'none' option to allow users to cancel the category
    var noneItem = categoryMenuList.appendItem(calGetString("calendar", "None"),
                                               "NONE");

    for (var i in categoriesList) {
        var catItem = categoryMenuList.appendItem(categoriesList[i],
                                                  categoriesList[i]);
        catItem.value = categoriesList[i];
        if (itemCategory && categoriesList[i] == itemCategory) {
            indexToSelect = parseInt(i) + 1;  // Add 1 because of 'None'
        }
    }

    categoryMenuList.selectedIndex = indexToSelect;

    // URL
    gURL = item.getProperty("URL");
    updateDocument();

    // Status
    setElementValue("item-description", item.getProperty("DESCRIPTION"));
    if (!isEvent(item)) {
        setElementValue("todo-status", item.getProperty("STATUS"));
    }

    // Task completed date
    if (item.completedDate) {
        updateToDoStatus(item.status, item.completedDate.jsDate);
    } else {
        updateToDoStatus(item.status);
    }

    // Task percent complete
    if (isToDo(item)) {
        var percentCompleteInteger = 0;
        var percentCompleteProperty = item.getProperty("PERCENT-COMPLETE");
        if (percentCompleteProperty != null) {
            percentCompleteInteger = parseInt(percentCompleteProperty);
        }
        if (percentCompleteInteger < 0) {
            percentCompleteInteger = 0;
        } else if (percentCompleteInteger > 100) {
            percentCompleteInteger = 100;
        }
        setElementValue("percent-complete-textbox", percentCompleteInteger);
    }

    // Priority
    gPriority = parseInt(item.priority);
    updatePriority();

    // Privacy
    gPrivacy = item.privacy;
    updatePrivacy();

    // load repeat details
    loadRepeat(item);

    // load reminder details
    loadReminder(item);

    // hide rows based on if this is an event or todo
    updateStyle();

    updateDateTime();

    updateCalendar();

    // figure out what the title of the dialog should be and set it
    updateTitle();

    updateAttendees();
    updateRepeat();
    updateReminder();

    // How easy would it be to just call hasProperty(), but unfortunately
    // this is currently flawed and doesn't give us the answer we're longing for.
    // hasProperty() unconditionally forwards the request to the parent item
    // if the property doesn't exist at the occurrence. That's why we need to
    // use this somewhat awkward construct.
    gShowTimeAs = (item.getUnproxiedProperty("TRANSP") != null) ?
        item.getUnproxiedProperty("TRANSP") : null;
    updateShowTimeAs();
}

function loadDateTime(item) {
    if (isEvent(item)) {
        var startTime = item.startDate;
        var endTime = item.endDate;
        var duration = endTime.subtractDate(startTime);

        // Check if an all-day event has been passed in (to adapt endDate).
        if (startTime.isDate) {
            startTime = startTime.clone();
            endTime = endTime.clone();

            endTime.day--;
            duration.days--;
        }

        // store the start/end-times as calIDateTime-objects
        // converted to the default timezone. store the timezones
        // separately.
        var kDefaultTimezone = calendarDefaultTimezone();
        gStartTimezone = startTime.timezone;
        gEndTimezone = endTime.timezone;
        gStartTime = startTime.getInTimezone(kDefaultTimezone);
        gEndTime = endTime.getInTimezone(kDefaultTimezone);
        gItemDuration = duration;
    }

    if (isToDo(item)) {
        var startTime = null;
        var endTime = null;
        var duration = null;

        var kDefaultTimezone = calendarDefaultTimezone();
        var hasEntryDate = (item.entryDate != null);
        if (hasEntryDate) {
            startTime = item.entryDate;
            gStartTimezone = startTime.timezone;
            startTime = startTime.getInTimezone(kDefaultTimezone);
        } else {
            gStartTimezone = kDefaultTimezone;
        }
        var hasDueDate = (item.dueDate != null);
        if (hasDueDate) {
            endTime = item.dueDate;
            gEndTimezone = endTime.timezone;
            endTime = endTime.getInTimezone(kDefaultTimezone);
        } else {
            gEndTimezone = kDefaultTimezone;
        }
        if (hasEntryDate && hasDueDate) {
            duration = endTime.subtractDate(startTime);
        }

        gStartTime = startTime;
        gEndTime = endTime;
        gItemDuration = duration;
    }
}


function dateTimeControls2State(aKeepDuration) {
    if (gIgnoreUpdate) {
        return;
    }

    var startWidgetId;
    var endWidgetId;
    if (isEvent(window.calendarItem)) {
        startWidgetId = "event-starttime";
        endWidgetId = "event-endtime";
    } else {
        if (!getElementValue("todo-has-entrydate", "checked")) {
            gItemDuration = null;
        }
        if (!getElementValue("todo-has-duedate", "checked")) {
            gItemDuration = null;
        }
        startWidgetId = "todo-entrydate";
        endWidgetId = "todo-duedate";
    }

    var saveStartTime = gStartTime;
    var saveEndTime = gEndTime;
    var kDefaultTimezone = calendarDefaultTimezone();

    if (gStartTime) {

        // jsDate is always in OS timezone, thus we create a calIDateTime
        // object from the jsDate representation and simply set the new
        // timezone instead of converting.
        var start = jsDateToDateTime(getElementValue(startWidgetId));
        start = start.getInTimezone(kDefaultTimezone);
        var menuItem = document.getElementById('menu-options-timezone');
        if (menuItem.getAttribute('checked') == 'true') {
            start.timezone = gStartTimezone;
        }
        gStartTime = start.clone();
    }
    
    if (gItemDuration) {
        start.addDuration(gItemDuration);
        start = start.getInTimezone(gEndTimezone);
    }
    
    if (gEndTime) {
        var end = start;
        if (!aKeepDuration) {
          end = jsDateToDateTime(getElementValue(endWidgetId));
          end = end.getInTimezone(kDefaultTimezone);
          var timezone = gEndTimezone;
          if (timezone == "UTC") {
              if (gStartTime && gStartTimezone != gEndTimezone) {
                  timezone = gStartTimezone;
              }
          }
          var menuItem = document.getElementById('menu-options-timezone');
          if (menuItem.getAttribute('checked') == 'true') {
              end.timezone = timezone;
          }
        }
        gEndTime = end;
    }

    if (getElementValue("event-all-day", "checked")) {
        gStartTime.isDate = true;
    }

    // calculate the new duration of start/end-time.
    // don't allow for negative durations.
    var warning = false;
    if (!aKeepDuration && gStartTime && gEndTime) {
        if (gEndTime.compare(gStartTime) >= 0) {
            gItemDuration = gEndTime.subtractDate(gStartTime);
        } else {
            gStartTime = saveStartTime;
            gEndTime = saveEndTime;
            warning = true;
        }
    }

    updateDateTime();
    updateTimezone();

    if (warning) {
        var callback = function func() {
            var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Ci.nsIPromptService);
            promptService.alert(
                null,
                document.title,
                calGetString("calendar", "warningNegativeDuration"));
        }
        setTimeout(callback, 1);
    }
}

function updateEntryDate() {
    updateDateCheckboxes(
        "todo-entrydate",
        "todo-has-entrydate",
        {
            isValid: function() {
                return gStartTime != null;
            },
            setDateTime: function(dt) {
                gStartTime = dt;
            }
        });
}

function updateDueDate() {
    updateDateCheckboxes(
        "todo-duedate",
        "todo-has-duedate",
        {
            isValid: function() {
                return gEndTime != null;
            },
            setDateTime: function(dt) {
                gEndTime = dt;
            }
        });
}

function updateDateCheckboxes(aDatePickerId, aCheckboxId, aDateTime) {
    if (gIgnoreUpdate) {
        return;
    }

    if (!isToDo(window.calendarItem)) {
        return;
    }

    // force something to get set if there was nothing there before
    setElementValue(aDatePickerId, getElementValue(aDatePickerId));

    // first of all disable the datetime picker if we don't have a date
    var hasDate = getElementValue(aCheckboxId, "checked");
    setElementValue(aDatePickerId, !hasDate, "disabled");

    // create a new datetime object if date is now checked for the first time
    if (hasDate && !aDateTime.isValid()) {
        var kDefaultTimezone = calendarDefaultTimezone();
        var date = jsDateToDateTime(getElementValue(aDatePickerId));
        date = date.getInTimezone(kDefaultTimezone);
        aDateTime.setDateTime(date);
    } else if (!hasDate && aDateTime.isValid()) {
        aDateTime.setDateTime(null);
    }

    // calculate the duration if possible
    var hasEntryDate = getElementValue("todo-has-entrydate", "checked");
    var hasDueDate = getElementValue("todo-has-duedate", "checked");
    if (hasEntryDate && hasDueDate) {
        var start = jsDateToDateTime(getElementValue("todo-entrydate"));
        var end = jsDateToDateTime(getElementValue("todo-duedate"));
        gItemDuration = end.subtractDate(start);
    } else {
        gItemDuration = null;
    }

    updateDateTime();
    updateTimezone();
}

function loadRepeat(item) {
    var recurrenceInfo = window.recurrenceInfo;
    setElementValue("item-repeat", "none");
    if (recurrenceInfo) {
        setElementValue("item-repeat", "custom");
        var ritems = recurrenceInfo.getRecurrenceItems({});
        var rules = [];
        var exceptions = [];
        for each (var r in ritems) {
            if (r.isNegative) {
                exceptions.push(r);
            } else {
                rules.push(r);
            }
        }
        if (rules.length == 1) {
            var rule = rules[0];
            if (rule instanceof Ci.calIRecurrenceRule) {
                switch (rule.type) {
                    case 'DAILY':
                        if (rule.interval == 1 && !rule.isFinite) {
                            if (!checkRecurrenceRule(rule, ['BYSECOND',
                                                            'BYMINUTE',
                                                            'BYHOUR',
                                                            'BYMONTHDAY',
                                                            'BYYEARDAY',
                                                            'BYWEEKNO',
                                                            'BYMONTH',
                                                            'BYSETPOS'])) {
                                var ruleComp = rule.getComponent("BYDAY",
                                                                 {});
                                if (ruleComp.length > 0) {
                                    if (ruleComp.length == 5) {
                                        for (var i = 0; i < 5; i++) {
                                            if (ruleComp[i] != i + 2) {
                                                break;
                                            }
                                        }
                                        if (i==5) {
                                            setElementValue("item-repeat",
                                                            "every.weekday");
                                        }
                                    }
                                } else {
                                    setElementValue("item-repeat", "daily");
                                }
                            }
                        }
                        break;
                    case 'WEEKLY':
                        if (!checkRecurrenceRule(rule, ['BYSECOND',
                                                        'BYMINUTE',
                                                        'BYDAY',
                                                        'BYHOUR',
                                                        'BYMONTHDAY',
                                                        'BYYEARDAY',
                                                        'BYWEEKNO',
                                                        'BYMONTH',
                                                        'BYSETPOS'])) {
                            if (!rule.isFinite && rule.interval == 1) {
                                setElementValue("item-repeat", "weekly");
                            } else if (!rule.isFinite && rule.interval == 2) {
                                setElementValue("item-repeat", "bi.weekly");
                            }
                        }
                        break;
                    case 'MONTHLY':
                        if (!checkRecurrenceRule(rule, ['BYSECOND',
                                                        'BYMINUTE',
                                                        'BYDAY',
                                                        'BYHOUR',
                                                        'BYMONTHDAY',
                                                        'BYYEARDAY',
                                                        'BYWEEKNO',
                                                        'BYMONTH',
                                                        'BYSETPOS'])) {
                            if (!rule.isFinite && rule.interval == 1) {
                                setElementValue("item-repeat", "monthly");
                            }
                        }
                        break;
                    case 'YEARLY':
                        if (!checkRecurrenceRule(rule, ['BYSECOND',
                                                        'BYMINUTE',
                                                        'BYDAY',
                                                        'BYHOUR',
                                                        'BYMONTHDAY',
                                                        'BYYEARDAY',
                                                        'BYWEEKNO',
                                                        'BYMONTH',
                                                        'BYSETPOS'])) {
                            if (!rule.isFinite && rule.interval == 1) {
                                setElementValue("item-repeat", "yearly");
                            }
                        }
                        break;
                }
            }
        }
    }

    var repeatMenu = document.getElementById("item-repeat");
    gLastRepeatSelection = repeatMenu.selectedIndex;

    if (item.parentItem != item) {
        disableElement("item-repeat");
    }
}

function updateReminder() {
    commonUpdateReminder();
    updateAccept();
}

function saveDialog(item) {
    setItemProperty(item, "title", getElementValue("item-title"));
    setItemProperty(item, "LOCATION", getElementValue("item-location"));

    saveDateTime(item);

    if (isToDo(item)) {
        var percentCompleteInteger = 0;
        if (getElementValue("percent-complete-textbox") != "") {
            percentCompleteInteger =
                parseInt(getElementValue("percent-complete-textbox"));
        }
        if (percentCompleteInteger < 0) {
            percentCompleteInteger = 0;
        } else if (percentCompleteInteger > 100) {
            percentCompleteInteger = 100;
        }
        setItemProperty(item, "PERCENT-COMPLETE", percentCompleteInteger);
    }

    // Category
    var category = getElementValue("item-categories");

    if (category != "NONE") {
       setItemProperty(item, "CATEGORIES", category);
    } else {
       item.deleteProperty("CATEGORIES");
    }

    // URL
    setItemProperty(item, "URL", gURL);

    setItemProperty(item, "DESCRIPTION", getElementValue("item-description"));

    if (!isEvent(item)) {
        var status = getElementValue("todo-status");
        if (status != "COMPLETED") {
            item.completedDate = null;
        }
        setItemProperty(item, "STATUS",   status);
    }

    // set the "PRIORITY" property if a valid priority has been
    // specified (any integer value except *null*) OR the item
    // already specifies a priority. in any other case we don't
    // need this property and can safely delete it. we need this special
    // handling since the WCAP provider always includes the priority
    // with value *null* and we don't detect changes to this item if
    // we delete this property.
    if (gPriority || item.hasProperty("PRIORITY")) {
        item.setProperty("PRIORITY", gPriority);
    } else {
        item.deleteProperty("PRIORITY");
    }

    if (gShowTimeAs) {
        item.setProperty("TRANSP", gShowTimeAs);
    } else {
        item.deleteProperty("TRANSP");
    }

    setItemProperty(item, "CLASS", gPrivacy);

    if (item.status == "COMPLETED" && isToDo(item)) {
        var elementValue = getElementValue("completed-date-picker");
        item.completedDate = jsDateToDateTime(elementValue);
    }

    saveReminder(item);
}

function saveDateTime(item) {
    var kDefaultTimezone = calendarDefaultTimezone();
    if (isEvent(item)) {
        var startTime = gStartTime.getInTimezone(gStartTimezone);
        var endTime = gEndTime.getInTimezone(gEndTimezone);
        var isAllDay = getElementValue("event-all-day", "checked");
        if (isAllDay) {
            startTime = startTime.clone();
            endTime = endTime.clone();
            startTime.isDate = true;
            endTime.isDate = true;
            endTime.day += 1;
        } else {
            startTime = startTime.clone();
            startTime.isDate = false;
            endTime = endTime.clone();
            endTime.isDate = false;
        }
        setItemProperty(item, "startDate", startTime);
        setItemProperty(item, "endDate", endTime);
    }
    if (isToDo(item)) {
        var startTime = gStartTime && gStartTime.getInTimezone(gStartTimezone);
        var endTime = gEndTime && gEndTime.getInTimezone(gEndTimezone);
        setItemProperty(item, "entryDate", startTime);
        setItemProperty(item, "dueDate", endTime);
    }
}

function updateTitle() {
    var title = "";
    var isNew = window.calendarItem.isMutable;
    if (isEvent(window.calendarItem)) {
        if (isNew) {
            title = calGetString("calendar", "newEventDialog");
        } else {
            title = calGetString("calendar", "editEventDialog");
        }
    } else if (isToDo(window.calendarItem)) {
        if (isNew) {
            title = calGetString("calendar", "newTaskDialog");
        } else {
            title = calGetString("calendar", "editTaskDialog");
        }
    }
    title += ': ';
    title += getElementValue("item-title");
    document.title = title;
}

function updateStyle() {
    const kDialogStylesheet = "chrome://calendar/content/sun-calendar-event-dialog.css";

    for each (var stylesheet in document.styleSheets) {
        if (stylesheet.href == kDialogStylesheet) {
            if (gIsSunbird) {
                stylesheet.insertRule(".lightning-only { display: none; }", 0);
            }
            if (isEvent(window.calendarItem)) {
                stylesheet.insertRule(".todo-only { display: none; }", 0);
            } else if (isToDo(window.calendarItem)) {
                stylesheet.insertRule(".event-only { display: none; }", 0);
            }
            return;
        }
    }
}

function updateAccept() {
    var enableAccept = true;

    var kDefaultTimezone = calendarDefaultTimezone();

    // don't allow for end dates to be before start dates
    var startDate;
    var endDate;
    if (isEvent(window.calendarItem)) {
        startDate = jsDateToDateTime(getElementValue("event-starttime"));
        endDate = jsDateToDateTime(getElementValue("event-endtime"));

        var menuItem = document.getElementById('menu-options-timezone');
        if (menuItem.getAttribute('checked') == 'true') {
            var startTimezone = gStartTimezone;
            var endTimezone = gEndTimezone;
            if (endTimezone == "UTC") {
                if (gStartTimezone != gEndTimezone) {
                    endTimezone = gStartTimezone;
                }
            }

            startDate = startDate.getInTimezone(kDefaultTimezone);
            endDate = endDate.getInTimezone(kDefaultTimezone);

            startDate.timezone = startTimezone;
            endDate.timezone = endTimezone;
        }

        startDate = startDate.getInTimezone(kDefaultTimezone);
        endDate = endDate.getInTimezone(kDefaultTimezone);

        // For all-day events we are not interested in times and compare only
        // dates.
        if (getElementValue("event-all-day", "checked")) {
            // jsDateToDateTime returnes the values in UTC. Depending on the
            // local timezone and the values selected in datetimepicker the date
            // in UTC might be shifted to the previous or next day.
            // For example: The user (with local timezone GMT+05) selected
            // Feb 10 2006 00:00:00. The corresponding value in UTC is
            // Feb 09 2006 19:00:00. If we now set isDate to true we end up with
            // a date of Feb 09 2006 instead of Feb 10 2006 resulting in errors
            // during the following comparison.
            // Calling getInTimezone() ensures that we use the same dates as
            // displayed to the user in datetimepicker for comparison.
            startDate.isDate = true;
            endDate.isDate = true;
        }
    } else {
        startDate = getElementValue("todo-has-entrydate", "checked") ?
            jsDateToDateTime(getElementValue("todo-entrydate")) : null;
        endDate = getElementValue("todo-has-duedate", "checked") ?
            jsDateToDateTime(getElementValue("todo-duedate")) : null;
    }

    if (endDate && startDate && endDate.compare(startDate) == -1) {
        enableAccept = false;
    }

    var accept = document.getElementById("cmd_accept");
    if (enableAccept) {
        accept.removeAttribute('disabled');
    } else {
        accept.setAttribute('disabled', 'true');
    }

    return enableAccept;
}

// this function sets the enabled/disabled
// state of the following controls:
// - 'event-starttime'
// - 'event-endtime'
// - 'timezone-starttime'
// - 'timezone-endtime'
// the state depends on whether or not the
// event is configured as 'all-day' or not.
function updateAllDay() {
    if (gIgnoreUpdate) {
        return;
    }

    if (!isEvent(window.calendarItem)) {
        return;
    }

    var allDay = getElementValue("event-all-day", "checked");
    setElementValue("event-starttime", allDay, "timepickerdisabled");
    setElementValue("event-endtime", allDay, "timepickerdisabled");

    var tzStart = document.getElementById("timezone-starttime");
    var tzEnd = document.getElementById("timezone-endtime");

    setShowTimeAs(allDay);

    gStartTime.isDate = allDay;
    gEndTime.isDate = allDay;

    // disable the timezone links if 'allday' is checked OR the
    // calendar of this item is read-only. in any other case we
    // enable the links.
    if (allDay || gIsReadOnly) {
        tzStart.setAttribute("disabled", "true");
        tzEnd.setAttribute("disabled", "true");
        tzStart.removeAttribute("class");
        tzEnd.removeAttribute("class");
    } else {
        tzStart.removeAttribute("disabled");
        tzEnd.removeAttribute("disabled");
        tzStart.setAttribute("class", "text-link");
        tzEnd.setAttribute("class", "text-link");
    }

    updateDateTime();
    updateRepeatDetails();
    updateAccept();
}

function openNewEvent() {
    var item = window.calendarItem;
    var args = window.arguments[0];
    args.onNewEvent(item.calendar);
}

function openNewMessage() {
    var msgComposeService = Cc["@mozilla.org/messengercompose;1"]
                            .getService(Ci.nsIMsgComposeService);
    msgComposeService.OpenComposeWindow(null,
                                        null,
                                        Ci.nsIMsgCompType.New,
                                        Ci.nsIMsgCompFormat.Default,
                                        null,
                                        null);
}

function openNewCardDialog() {
    window.openDialog(
        "chrome://messenger/content/addressbook/abNewCardDialog.xul",
        "",
        "chrome,resizable=no,titlebar,modal");
}

// automatically select "show time as free" if this
// event is said to be all-day.
function setShowTimeAs(allDay) {
    gShowTimeAs = allDay ? "TRANSPARENT" : "OPAQUE";
    updateShowTimeAs();
}

function editAttendees() {
    var savedWindow = window;
    var calendar = document.getElementById("item-calendar")
                           .selectedItem.calendar;

    var callback = function(attendees, organizer, startTime, endTime) {
        savedWindow.attendees = attendees;
        if (organizer) {
            // In case we didn't have an organizer object before we
            // added attendees to our event we take the one created
            // by the 'invite attendee'-dialog.
            if (!savedWindow.organizer) {
                savedWindow.organizer = organizer.clone();
            }
            // The other case is that we already had an organizer object
            // before we went throught the 'invite attendee'-dialog. In that
            // case make sure we don't carry over attributes that have been
            // set to their default values by the dialog but don't actually
            // exist in the original organizer object.
            if (!savedWindow.organizer.id) {
                organizer.id = null;
            }
            if (!savedWindow.organizer.role) {
                organizer.role = null;
            }
            if (!savedWindow.organizer.participationStatus) {
                organizer.participationStatus = null;
            }
            if (!savedWindow.organizer.commonName) {
                organizer.commonName = null;
            }
            savedWindow.organizer = organizer;
        }
        var duration = endTime.subtractDate(startTime);
        startTime = startTime.clone();
        endTime = endTime.clone();
        var kDefaultTimezone = calendarDefaultTimezone();
        gStartTimezone = startTime.timezone;
        gEndTimezone = endTime.timezone;
        gStartTime = startTime.getInTimezone(kDefaultTimezone);
        gEndTime = endTime.getInTimezone(kDefaultTimezone);
        gItemDuration = duration;
        updateAttendees();
        updateDateTime();
        if (isAllDay != gStartTime.isDate){
            setShowTimeAs(gStartTime.isDate)
        }
    };

    var startTime = gStartTime.getInTimezone(gStartTimezone);
    var endTime = gEndTime.getInTimezone(gEndTimezone);

    var isAllDay = getElementValue("event-all-day", "checked");
    if (isAllDay) {
        startTime.isDate = true;
        endTime.isDate = true;
        endTime.day += 1;
    } else {
        startTime.isDate = false;
        endTime.isDate = false;
    }

    var menuItem = document.getElementById('menu-options-timezone');
    var displayTimezone = menuItem.getAttribute('checked') == 'true';

    var args = new Object();
    args.startTime = startTime;
    args.endTime = endTime;
    args.displayTimezone = displayTimezone;
    args.attendees = window.attendees;
    args.organizer = window.organizer && window.organizer.clone();
    args.calendar = calendar;
    args.item = window.calendarItem;
    args.onOk = callback;
    args.fbWrapper = window.fbWrapper;

    // open the dialog modally
    openDialog(
        "chrome://calendar/content/sun-calendar-event-dialog-attendees.xul",
        "_blank",
        "chrome,titlebar,modal,resizable",
        args);
}

function editPrivacy(target) {
    gPrivacy = target.getAttribute("value");

    switch (gPrivacy) {
        case "PRIVATE":
            gShowTimeAs = "TRANSPARENT";
            break;
        case "CONFIDENTIAL":
        case "PUBLIC":
            gShowTimeAs = "OPAQUE";
            break;
    }

    updateShowTimeAs();
    updatePrivacy();
}

// this function updates the UI according to the global field 'gPrivacy'.
// in case 'gPrivacy' is modified updatePrivacy() should be called to
// reflect the modification in the UI.
function updatePrivacy() {
    var privacyPublic = document.getElementById("cmd_privacy_public");
    var privacyConfidential = document.getElementById("cmd_privacy_confidential");
    var privacyPrivate = document.getElementById("cmd_privacy_private");

    privacyPublic.setAttribute(
        "checked",
        privacyPublic.getAttribute("value") == gPrivacy ?
            "true" : "false");
    privacyConfidential.setAttribute(
        "checked",
        privacyConfidential.getAttribute("value") == gPrivacy ?
            "true" : "false");
    privacyPrivate.setAttribute(
        "checked",
        privacyPrivate.getAttribute("value") == gPrivacy ?
            "true" : "false");

    var statusbar = document.getElementById("status-bar");
    var numChilds = statusbar.childNodes.length;
    for (var i = 0; i < numChilds; i++) {
        var node = statusbar.childNodes[i];
        if (node.hasAttribute("privacy")) {
            if (gPrivacy != node.getAttribute("privacy")) {
                node.setAttribute("collapsed", "true");
            } else {
                node.removeAttribute("collapsed");
            }
        }
    }
}

function editPriority(target) {
    gPriority = parseInt(target.getAttribute("value"));
    updatePriority();
}

function updatePriority() {
    var priorityLevel = "none";
    if (gPriority >= 1 && gPriority <= 4) {
        priorityLevel = "high";
    } else if (gPriority == 5) {
        priorityLevel = "normal";
    } else if (gPriority >= 6 && gPriority <= 9) {
        priorityLevel = "low";
    }

    var priorityNone = document.getElementById("cmd_priority_none");
    var priorityLow = document.getElementById("cmd_priority_low");
    var priorityNormal = document.getElementById("cmd_priority_normal");
    var priorityHigh = document.getElementById("cmd_priority_high");

    priorityNone.setAttribute("checked",
                              priorityLevel == "none" ? "true" : "false");
    priorityLow.setAttribute("checked",
                             priorityLevel == "low" ? "true" : "false");
    priorityNormal.setAttribute("checked",
                                priorityLevel == "normal" ? "true" : "false");
    priorityHigh.setAttribute("checked",
                              priorityLevel == "high" ? "true" : "false");

    var priority = document.getElementById("status-priority");
    var collapse = (priorityLevel == "none" ? true : false);
    var numChilds = priority.childNodes.length;
    for (var i = 0; i < numChilds; i++) {
        var node = priority.childNodes[i];
        if (collapse) {
            node.setAttribute("collapsed", "true");
        } else {
            node.removeAttribute("collapsed");
        }
        if (node.getAttribute("value") == priorityLevel) {
            collapse = true;
        }
    }
}

function editShowTimeAs(target) {
    gShowTimeAs = target.getAttribute("value");
    updateShowTimeAs();
}

function updateShowTimeAs() {
    var showAsBusy = document.getElementById("cmd_showtimeas_busy");
    var showAsFree = document.getElementById("cmd_showtimeas_free");

    showAsBusy.setAttribute("checked",
                            gShowTimeAs == "OPAQUE" ? "true" : "false");
    showAsFree.setAttribute("checked",
                            gShowTimeAs == "TRANSPARENT" ? "true" : "false");
}

function editURL() {
    var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                       .getService(Ci.nsIPromptService);
    if (promptService) {
        // ghost in an example...
        if (!gURL) {
            gURL = "http://www.example.com";
        }
        var result = { value: gURL };
        if (promptService.prompt(
            window,
            calGetString("sun-calendar-event-dialog", "specifyLinkLocation"),
            calGetString("sun-calendar-event-dialog", "enterLinkLocation"),
            result,
            null,
            { value: 0 })) {
            var url = result.value;
            // The user might have just put in 'www.foo.com', correct that here
            if (url != "" && url.indexOf( ":" ) == -1) {
                url = "http://" + url;
            }
            gURL = url;
            updateDocument();
        }
    }
}

function setItemProperty(item, propertyName, value) {
    switch (propertyName) {
        case "startDate":
            if (value.isDate && !item.startDate.isDate ||
                !value.isDate && item.startDate.isDate ||
                value.timezone != item.startDate.timezone ||
                value.compare(item.startDate) != 0) {
                item.startDate = value;
            }
            break;
        case "endDate":
            if (value.isDate && !item.endDate.isDate ||
                !value.isDate && item.endDate.isDate ||
                value.timezone != item.endDate.timezone ||
                value.compare(item.endDate) != 0) {
                item.endDate = value;
            }
            break;
        case "entryDate":
            if (value == item.entryDate) {
                break;
            }
            if (value && !item.entryDate ||
                !value && item.entryDate ||
                value.isDate != item.entryDate.isDate ||
                value.timezone != item.entryDate.timezone ||
                value.compare(item.entryDate) != 0) {
                item.entryDate = value;
            }
            break;
        case "dueDate":
            if (value == item.dueDate) {
                break;
            }
            if (value && !item.dueDate ||
                !value && item.dueDate ||
                value.isDate != item.dueDate.isDate ||
                value.timezone != item.dueDate.timezone ||
                value.compare(item.dueDate) != 0) {
                item.dueDate = value;
            }
            break;
        case "isCompleted":
            if (value != item.isCompleted) {
                item.isCompleted = value;
            }
            break;
        case "title":
            if (value != item.title) {
                item.title = value;
            }
            break;
        default:
            if (!value || value == "") {
                item.deleteProperty(propertyName);
            } else if (item.getProperty(propertyName) != value) {
                item.setProperty(propertyName, value);
            }
            break;
    }
}

function updateCalendar() {
    var item = window.calendarItem;
    var calendar = document.getElementById("item-calendar")
                           .selectedItem.calendar;

    gIsReadOnly = true;
    if (calendar) {
        gIsReadOnly = calendar.readOnly;
    }

    // update the accept button
    updateAccept();

    // TODO: the code above decided about whether or not the item is readonly.
    // below we enable/disable all controls based on this decision.
    // unfortunately some controls need to be disabled based on some other
    // criteria. this is why we enable all controls in case the item is *not*
    // readonly and run through all those updateXXX() functions to disable
    // them again based on the specific logic build into those function. is this
    // really a good idea?
    if (gIsReadOnly) {
        var disableElements = document.getElementsByAttribute("disable-on-readonly", "true");
        for (var i = 0; i < disableElements.length; i++) {
            disableElements[i].setAttribute('disabled', 'true');

            // we mark link-labels with the hyperlink attribute, since we need
            // to remove their class in case they get disabled. TODO: it would
            // be better to create a small binding for those link-labels
            // instead of adding those special stuff.
            if (disableElements[i].hasAttribute('hyperlink')) {
                disableElements[i].removeAttribute('class');
                disableElements[i].removeAttribute('onclick');
            }
        }

        var collapseElements = document.getElementsByAttribute("collapse-on-readonly", "true");
        for (var i = 0; i < collapseElements.length; i++) {
            collapseElements[i].setAttribute('collapsed', 'true');
        }
    } else {
        var enableElements = document.getElementsByAttribute("disable-on-readonly", "true");
        for (var i = 0; i < enableElements.length; i++) {
            enableElements[i].removeAttribute('disabled');
            if (enableElements[i].hasAttribute('hyperlink')) {
                enableElements[i].setAttribute('class', 'text-link');
            }
        }

        var collapseElements = document.getElementsByAttribute("collapse-on-readonly", "true");
        for (var i = 0; i < collapseElements.length; i++) {
            collapseElements[i].removeAttribute('collapsed');
        }

        // Task completed date
        if (item.completedDate) {
            updateToDoStatus(item.status, item.completedDate.jsDate);
        } else {
            updateToDoStatus(item.status);
        }

        // disable repeat menupopup if this is an occurrence
        var item = window.calendarItem;
        if (item.parentItem != item) {
            disableElement("item-repeat");
            var repeatDetails = document.getElementById("repeat-details");
            var numChilds = repeatDetails.childNodes.length;
            for (var i = 0; i < numChilds; i++) {
                var node = repeatDetails.childNodes[i];
                node.setAttribute('disabled', 'true');
                node.removeAttribute('class');
                node.removeAttribute('onclick');
            }
        }

        // If the item is a proxy occurrence/instance, a few things aren't
        // valid.
        if (item.parentItem != item) {
            setElementValue("item-calendar", "true", "disabled");

            // don't allow to revoke the entrydate of recurring todo's.
            disableElementWithLock("todo-has-entrydate", "permanent-lock");
        }

        // update datetime pickers
        updateDueDate();
        updateEntryDate();

        // update datetime pickers
        updateAllDay();
    }
}

function editRepeat() {
    var args = new Object();
    args.calendarEvent = window.calendarItem;
    args.recurrenceInfo = window.recurrenceInfo;
    args.startTime = gStartTime;
    args.endTime = gEndTime;

    var savedWindow = window;
    args.onOk = function(recurrenceInfo) {
        savedWindow.recurrenceInfo = recurrenceInfo;
    };

    window.setCursor("wait");

    // open the dialog modally
    openDialog(
        "chrome://calendar/content/sun-calendar-event-dialog-recurrence.xul",
        "_blank",
        "chrome,titlebar,modal,resizable",
        args);
}

/**
 * This function is responsilble for propagating UI state to controls
 * depending on the repeat setting of an item. This functionality is used
 * after the dialog has been loaded as well as if the repeat pattern has
 * been changed.
 */
function updateRepeat() {
    var repeatMenu = document.getElementById("item-repeat");
    var repeatItem = repeatMenu.selectedItem;
    var repeatValue = repeatItem.getAttribute("value");

    if (repeatValue == 'none') {
        window.recurrenceInfo = null;
        var item = window.calendarItem;
        if (isToDo(item)) {
            enableElementWithLock("todo-has-entrydate", "repeat-lock");
        }
    } else if (repeatValue == 'custom') {
        // the user selected custom repeat pattern. we now need to bring
        // up the appropriate dialog in order to let the user specify the
        // new rule. first of all, retrieve the item we want to specify
        // the custom repeat pattern for.
        var item = window.calendarItem;

        // if this item is a task, we need to make sure that it has
        // an entry-date, otherwise we can't create a recurrence.
        if (isToDo(item)) {
            // automatically check 'has entrydate' if needed.
            if (!getElementValue("todo-has-entrydate", "checked")) {
                setElementValue("todo-has-entrydate", "true", "checked");

                // make sure gStartTime is properly initialized
                updateEntryDate();
            }

            // disable the checkbox to indicate that we need
            // the entry-date. the 'disabled' state will be
            // revoked if the user turns off the repeat pattern.
            disableElementWithLock("todo-has-entrydate", "repeat-lock");
        }

        // retrieve the current recurrence info, we need this
        // to find out whether or not the user really created
        // a new repeat pattern.
        var recurrenceInfo = window.recurrenceInfo;

        // now bring up the recurrence dialog.
        // don't pop up the dialog if this happens during
        // initialization of the dialog.
        if (repeatMenu.hasAttribute("last-value")) {
            editRepeat();
        }

        // we need to address two separate cases here.
        // 1) we need to revoke the selection of the repeat
        //    drop down list in case the user didn't specify
        //    a new repeat pattern (i.e. canceled the dialog)
        // 2) re-enable the 'has entrydate' option in case
        //    we didn't end up with a recurrence rule.
        if (recurrenceInfo == window.recurrenceInfo) {
            repeatMenu.selectedIndex = gLastRepeatSelection;
            if (isToDo(item)) {
                if (!window.recurrenceInfo) {
                    enableElementWithLock("todo-has-entrydate", "repeat-lock");
                }
            }
        }
    } else {
        var item = window.calendarItem;
        var recurrenceInfo = window.recurrenceInfo || item.recurrenceInfo;
        if (recurrenceInfo) {
            recurrenceInfo = recurrenceInfo.clone();
            var rrules = splitRecurrenceRules(recurrenceInfo);
            if (rrules[0].length > 0) {
                recurrenceInfo.deleteRecurrenceItem(rrules[0][0]);
            }
        } else {
            recurrenceInfo = createRecurrenceInfo();
            recurrenceInfo.item = item;
        }

        switch (repeatValue) {
            case 'daily':
              var recRule = createRecurrenceRule();
              recRule.type = 'DAILY';
              recRule.interval = 1;
              recRule.count = -1;
              break;
            case 'weekly':
              var recRule = createRecurrenceRule();
              recRule.type = 'WEEKLY';
              recRule.interval = 1;
              recRule.count = -1;
              break;
            case 'every.weekday':
              var recRule = createRecurrenceRule();
              recRule.type = 'DAILY';
              recRule.interval = 1;
              recRule.count = -1;
              var onDays = [2, 3, 4, 5, 6];
              recRule.setComponent("BYDAY", onDays.length, onDays);
              break;
            case 'bi.weekly':
              var recRule = createRecurrenceRule();
              recRule.type = 'WEEKLY';
              recRule.interval = 2;
              recRule.count = -1;
              break;
            case 'monthly':
              var recRule = createRecurrenceRule();
              recRule.type = 'MONTHLY';
              recRule.interval = 1;
              recRule.count = -1;
              break;
            case 'yearly':
              var recRule = createRecurrenceRule();
              recRule.type = 'YEARLY';
              recRule.interval = 1;
              recRule.count = -1;
              break;
        }

        recurrenceInfo.insertRecurrenceItemAt(recRule, 0);
        window.recurrenceInfo = recurrenceInfo;

        if (isToDo(item)) {
            if (!getElementValue("todo-has-entrydate", "checked")) {
                setElementValue("todo-has-entrydate", "true", "checked");
            }
            disableElementWithLock("todo-has-entrydate", "repeat-lock");
        }
    }

    gLastRepeatSelection = repeatMenu.selectedIndex;
    repeatMenu.setAttribute("last-value", repeatValue);

    updateRepeatDetails();
    updateEntryDate();
    updateDueDate();
    updateAccept();
}

function updateToDoStatus(status, passedInCompletedDate) {
  // RFC2445 doesn't support completedDates without the todo's status
  // being "COMPLETED", however twiddling the status menulist shouldn't
  // destroy that information at this point (in case you change status
  // back to COMPLETED). When we go to store this VTODO as .ics the
  // date will get lost.

  var completedDate;
  if (passedInCompletedDate) {
      completedDate = passedInCompletedDate;
  } else {
      completedDate = null;
  }

  // remember the original values
  var oldPercentComplete = getElementValue("percent-complete-textbox");
  var oldCompletedDate   = getElementValue("completed-date-picker");

  switch (status) {
      case null:
      case "":
      case "NONE":
          document.getElementById("todo-status").selectedIndex = 0;
          disableElement("percent-complete-textbox");
          disableElement("percent-complete-label");
          break;
      case "CANCELLED":
          document.getElementById("todo-status").selectedIndex = 4;
          disableElement("percent-complete-textbox");
          disableElement("percent-complete-label");
          break;
      case "COMPLETED":
          document.getElementById("todo-status").selectedIndex = 3;
          enableElement("percent-complete-textbox");
          enableElement("percent-complete-label");
          // if there isn't a completedDate, set it to now
          if (!completedDate)
              completedDate = new Date();
          break;
      case "IN-PROCESS":
          document.getElementById("todo-status").selectedIndex = 2;
          disableElement("completed-date-picker");
          enableElement("percent-complete-textbox");
          enableElement("percent-complete-label");
          break;
      case "NEEDS-ACTION":
          document.getElementById("todo-status").selectedIndex = 1;
          enableElement("percent-complete-textbox");
          enableElement("percent-complete-label");
          break;
  }

  if (status == "COMPLETED") {
      setElementValue("percent-complete-textbox", "100");
      setElementValue("completed-date-picker", completedDate);
      enableElement("completed-date-picker");
  } else {
      if (oldPercentComplete != 100) {
          setElementValue("percent-complete-textbox", oldPercentComplete);
      } else {
          setElementValue("percent-complete-textbox", "");
      }
      setElementValue("completed-date-picker", oldCompletedDate);
      disableElement("completed-date-picker");
  }
}

function saveItem() {
    // we need to clone the item in order to apply the changes.
    // it is important to not apply the changes to the original item
    // (even if it happens to be mutable) in order to guarantee
    // that providers see a proper oldItem/newItem pair in case
    // they rely on this fact (e.g. WCAP does).
    var originalItem = window.calendarItem;
    var item = originalItem.clone();

    // override item's recurrenceInfo *before* serializing date/time-objects.
    if (!window.isOccurrence) {
        item.recurrenceInfo = window.recurrenceInfo;
    }

    // serialize the item
    saveDialog(item);

    // we set the organizer of this item only if
    // it is a stand-alone instance [not an occurrence].
    if (!window.isOccurrence) {
        item.organizer = window.organizer;
    }

    // TODO: we set the array of attendees for the new item
    // regardless of it being an occurrence or not. probably
    // this is not correct.
    if (window.attendees) {
        item.removeAllAttendees();
        for each (var attendee in window.attendees) {
           item.addAttendee(attendee);
        }
    }

    return item;
}

function onCommandSave() {
    var originalItem = window.calendarItem;
    var item = saveItem();
    var calendar = document.getElementById("item-calendar")
                           .selectedItem.calendar;
    window.onAcceptCallback(item, calendar, originalItem);
    item.makeImmutable();
    window.calendarItem = item;
}

function onCommandExit() {
    // the correct way would be to hook 'onCancel' to the
    // 'tryToClose' attribute, but if the user wants to save
    // the changes we're running into trouble since the calendar
    // engine won't exit any longer, which results in dataloss.
    // window.tryToClose = onCancel;
    if (onCancel()) {
        goQuitApplication()
    }
}

function onCommandViewToolbar(aToolbarId, aMenuItemId) {
    var toolbar = document.getElementById(aToolbarId);
    var menuItem = document.getElementById(aMenuItemId);

    if (!toolbar || !menuItem) {
        return;
    }

    var toolbarCollapsed = toolbar.collapsed;

    // toggle the checkbox
    menuItem.setAttribute('checked', toolbarCollapsed);

    // toggle visibility of the toolbar
    toolbar.collapsed = !toolbarCollapsed;

    document.persist(aToolbarId, 'collapsed');
    document.persist(aMenuItemId, 'checked');
}

/**
 * DialogToolboxCustomizeDone() is called after the customize toolbar dialog
 * has been closed by the user. We need to restore the state of all buttons
 * and commands of all customizable toolbars.
 */

function DialogToolboxCustomizeDone(aToolboxChanged) {

    var menubar = document.getElementById("event-menubar");
    for (var i = 0; i < menubar.childNodes.length; ++i) {
        menubar.childNodes[i].removeAttribute("disabled");
    }
  
    // make sure our toolbar buttons have the correct enabled state restored to them...
    document.commandDispatcher.updateCommands('itemCommands');

    // Enable the toolbar context menu items
    document.getElementById("cmd_customize").removeAttribute("disabled");
}

function onCommandCustomize() {
    // install the callback that handles what needs to be
    // done after a toolbar has been customized.
    var toolbox = document.getElementById("event-toolbox");
    toolbox.customizeDone = DialogToolboxCustomizeDone;

    var menubar = document.getElementById("event-menubar");
    for (var i = 0; i < menubar.childNodes.length; ++i) {
        menubar.childNodes[i].setAttribute("disabled", true);
    }
      
    // Disable the toolbar context menu items
    document.getElementById("cmd_customize").setAttribute("disabled", "true");

    var id = "event-toolbox";
    if (gIsSunbird) {
#ifdef MOZILLA_1_8_BRANCH
        var newwindow = window.openDialog("chrome://calendar/content/customizeToolbar.xul",
                                          "CustomizeToolbar",
                                          "chrome,all,dependent",
                                          document.getElementById(id));
#else
        window.openDialog("chrome://global/content/customizeToolbar.xul",
                          "CustomizeToolbar",
                          "chrome,all,dependent",
                          document.getElementById(id));
#endif
    } else {
        var wintype = document.documentElement.getAttribute("windowtype");
        wintype = wintype.replace(/:/g, "");

        window.openDialog("chrome://global/content/customizeToolbar.xul",
                          "CustomizeToolbar" + wintype,
                          "chrome,all,dependent",
                          document.getElementById(id), // toolbar dom node
                          false,                       // is mode toolbar yes/no?
                          null,                        // callback function
                          "dialog");                   // name of this mode
    }
}

function editStartTimezone() {
    editTimezone(
        "timezone-starttime",
        gStartTime.getInTimezone(gStartTimezone),
        function(datetime) {
            var equalTimezones = false;
            if (gStartTimezone && gEndTimezone) {
                if (gStartTimezone == gEndTimezone) {
                    equalTimezones = true;
                }
            }
            gStartTimezone = datetime.timezone;
            if (equalTimezones) {
              gEndTimezone = datetime.timezone;
            }
            updateDateTime();
        });
}

function editEndTimezone() {
    editTimezone(
        "timezone-endtime",
        gEndTime.getInTimezone(gEndTimezone),
        function(datetime) {
            var equalTimezones = false;
            if (gStartTimezone && gEndTimezone) {
                if (gStartTimezone == gEndTimezone) {
                    equalTimezones = true;
                }
            }
            if (equalTimezones) {
                gStartTimezone = datetime.timezone;
            }
            gEndTimezone = datetime.timezone;
            updateDateTime();
        });
}

function editTimezone(aElementId,aDateTime,aCallback) {
    if (document.getElementById(aElementId)
        .hasAttribute("disabled")) {
        return;
    }

    // prepare the arguments that will be passed to the dialog
    var args = new Object();
    args.time = gEndTime.getInTimezone(gEndTimezone);
    args.onOk = aCallback;

    // open the dialog modally
    openDialog(
        "chrome://calendar/content/sun-calendar-event-dialog-timezone.xul",
        "_blank",
        "chrome,titlebar,modal,resizable",
        args);
}

// this function initializes the following controls:
// - 'event-starttime'
// - 'event-endtime'
// - 'event-all-day'
// - 'todo-has-entrydate'
// - 'todo-entrydate'
// - 'todo-has-duedate'
// - 'todo-duedate'
// the date/time-objects are either displayed in their repective
// timezone or in the default timezone. this decision is based
// on whether or not 'menu-options-timezone' is checked.
// the necessary information is taken from the following variables:
// - 'gStartTime'
// - 'gEndTime'
// - 'window.calendarItem' (used to decide about event/task)
function updateDateTime() {
    gIgnoreUpdate = true;

    var item = window.calendarItem;
    var menuItem = document.getElementById('menu-options-timezone');

    // convert to default timezone if the timezone option
    // is *not* checked, otherwise keep the specific timezone
    // and display the labels in order to modify the timezone.
    if (menuItem.getAttribute('checked') == 'true') {
        if (isEvent(item)) {
          var startTime = gStartTime.getInTimezone(gStartTimezone);
          var endTime = gEndTime.getInTimezone(gEndTimezone);

          setElementValue("event-all-day", startTime.isDate, "checked");

          // in the case where the timezones are different but
          // the timezone of the endtime is "UTC", we convert
          // the endtime into the timezone of the starttime.
          if (startTime && endTime) {
            if (startTime.timezone != endTime.timezone) {
              if (endTime.timezone == "UTC") {
                endTime = endTime.getInTimezone(startTime.timezone);
              }
            }
          }

          // before feeding the date/time value into the control we need
          // to set the timezone to 'floating' in order to avoid the
          // automatic conversion back into the OS timezone.
          startTime.timezone = "floating";
          endTime.timezone = "floating";

          setElementValue("event-starttime", startTime.jsDate);
          setElementValue("event-endtime", endTime.jsDate);
        }

        if (isToDo(item)) {
          var startTime = gStartTime && gStartTime.getInTimezone(gStartTimezone);
          var endTime = gEndTime && gEndTime.getInTimezone(gEndTimezone);
          var hasEntryDate = (startTime != null);
          var hasDueDate = (endTime != null);

          if (hasEntryDate && hasDueDate) {
              setElementValue("todo-has-entrydate", hasEntryDate, "checked");
              startTime.timezone = "floating";
              setElementValue("todo-entrydate", startTime.jsDate);

              setElementValue("todo-has-duedate", hasDueDate, "checked");
              endTime.timezone = "floating";
              setElementValue("todo-duedate", endTime.jsDate);
          } else if (hasEntryDate) {
              setElementValue("todo-has-entrydate", hasEntryDate, "checked");
              startTime.timezone = "floating";
              setElementValue("todo-entrydate", startTime.jsDate);

              startTime.timezone = "floating";
              setElementValue("todo-duedate", startTime.jsDate);
          } else if (hasDueDate) {
              endTime.timezone = "floating";
              setElementValue("todo-entrydate", endTime.jsDate);

              setElementValue("todo-has-duedate", hasDueDate, "checked");
              endTime.timezone = "floating";
              setElementValue("todo-duedate", endTime.jsDate);
          }
        }
    } else {
        var kDefaultTimezone = calendarDefaultTimezone();

        if (isEvent(item)) {
            var startTime = gStartTime.getInTimezone(kDefaultTimezone);
            var endTime = gEndTime.getInTimezone(kDefaultTimezone);
            setElementValue("event-all-day", startTime.isDate, "checked");

            // before feeding the date/time value into the control we need
            // to set the timezone to 'floating' in order to avoid the
            // automatic conversion back into the OS timezone.
            startTime.timezone = "floating";
            endTime.timezone = "floating";
            setElementValue("event-starttime", startTime.jsDate);
            setElementValue("event-endtime", endTime.jsDate);
        }

        if (isToDo(item)) {
            var startTime = gStartTime &&
                            gStartTime.getInTimezone(kDefaultTimezone);
            var endTime = gEndTime && gEndTime.getInTimezone(kDefaultTimezone);
            var hasEntryDate = (startTime != null);
            var hasDueDate = (endTime != null);

            if (hasEntryDate && hasDueDate) {
                setElementValue("todo-has-entrydate", hasEntryDate, "checked");
                startTime.timezone = "floating";
                setElementValue("todo-entrydate", startTime.jsDate);

                setElementValue("todo-has-duedate", hasDueDate, "checked");
                endTime.timezone = "floating";
                setElementValue("todo-duedate", endTime.jsDate);
            } else if (hasEntryDate) {
                setElementValue("todo-has-entrydate", hasEntryDate, "checked");
                startTime.timezone = "floating";
                setElementValue("todo-entrydate", startTime.jsDate);

                startTime.timezone = "floating";
                setElementValue("todo-duedate", startTime.jsDate);
            } else if (hasDueDate) {
                endTime.timezone = "floating";
                setElementValue("todo-entrydate", endTime.jsDate);

                setElementValue("todo-has-duedate", hasDueDate, "checked");
                endTime.timezone = "floating";
                setElementValue("todo-duedate", endTime.jsDate);
            }
        }
    }

    updateTimezone();
    updateAllDay();

    gIgnoreUpdate = false;
}

// this function initializes the following controls:
// - 'timezone-starttime'
// - 'timezone-endtime'
// the timezone-links show the corrosponding names of the
// start/end times. if 'menu-options-timezone' is not checked
// the links will be collapsed.
function updateTimezone() {
    var menuItem = document.getElementById('menu-options-timezone');

    // convert to default timezone if the timezone option
    // is *not* checked, otherwise keep the specific timezone
    // and display the labels in order to modify the timezone.
    if (menuItem.getAttribute('checked') == 'true') {
        var startTimezone = gStartTimezone;
        var endTimezone = gEndTimezone;

        var equalTimezones = false;
        if (startTimezone && endTimezone) {
            if (startTimezone == endTimezone || endTimezone == "UTC") {
                equalTimezones = true;
            }
        }

        var tzStart = document.getElementById('timezone-starttime');
        var tzEnd = document.getElementById('timezone-endtime');

        if (startTimezone != null) {
            tzStart.removeAttribute('collapsed');
            tzStart.value = timezoneString(startTimezone);
            if (gIsReadOnly) {
                tzStart.removeAttribute('class');
                tzStart.removeAttribute('onclick');
                tzStart.setAttribute('disabled', 'true');
            }
        } else {
            tzStart.setAttribute('collapsed', 'true');
        }

        // we never display the second timezone if both are equal
        if (endTimezone != null && !equalTimezones) {
            tzEnd.removeAttribute('collapsed');
            tzEnd.value = timezoneString(endTimezone);
            if (gIsReadOnly) {
                tzEnd.removeAttribute('class');
                tzEnd.removeAttribute('onclick');
                tzEnd.setAttribute('disabled', 'true');
            }
        } else {
            tzEnd.setAttribute('collapsed', 'true');
        }
    } else {
        document.getElementById('timezone-starttime')
                .setAttribute('collapsed', 'true');
        document.getElementById('timezone-endtime')
                .setAttribute('collapsed', 'true');
    }
}

function updateDocument() {
    var documentRow = document.getElementById("document-row");
    if (!gURL || gURL == "") {
        documentRow.setAttribute('collapsed', 'true');
    } else {
        documentRow.removeAttribute('collapsed');
        var documentLink = document.getElementById("document-link");
        var callback = function func() {
            documentLink.setAttribute('value', gURL);
        }
        setTimeout(callback, 1);
    }
}

function browseDocument() {
    launchBrowser(gURL);
}

function updateAttendees() {
    var regexp = new RegExp("^mailto:(.*)", "i");
    var attendeeRow = document.getElementById("attendee-row");
    if (!window.attendees || !window.attendees.length) {
        attendeeRow.setAttribute('collapsed', 'true');
    } else {
        attendeeRow.removeAttribute('collapsed');
        var attendeeNames = "";
        var numAttendees = window.attendees.length;
        for (var i = 0; i < numAttendees; i++) {
            var attendee = window.attendees[i];
            if (attendee.commonName && attendee.commonName.length) {
                attendeeNames += attendee.commonName;
            } else if (attendee.id && attendee.id.length) {
                var email = attendee.id;
                if (regexp.test(email)) {
                    attendeeNames += RegExp.$1;
                } else {
                    attendeeNames += email;
                }
            } else {
                continue;
            }
            if (i + 1 < numAttendees) {
                attendeeNames += ',';
            }
        }
        var attendeeList = document.getElementById("attendee-list");
        var callback = function func() {
            attendeeList.setAttribute('value', attendeeNames);
        }
        setTimeout(callback, 1);
    }
}

function updateRepeatDetails() {
    // Don't try to show the details text for
    // anything but a custom recurrence rule.
    var item = window.calendarItem;
    var recurrenceInfo = window.recurrenceInfo;
    var itemRepeat = document.getElementById("item-repeat");
    if (itemRepeat.value == "custom" && recurrenceInfo) {
        var startDate = jsDateToDateTime(getElementValue("event-starttime"));
        var endDate = jsDateToDateTime(getElementValue("event-endtime"));
        var kDefaultTimezone = calendarDefaultTimezone();
        startDate = startDate.getInTimezone(kDefaultTimezone);
        endDate = endDate.getInTimezone(kDefaultTimezone);
        var allDay = getElementValue("event-all-day", "checked");
        commonUpdateRepeatDetails(recurrenceInfo,startDate,endDate,allDay);
    } else {
        var repeatDetails = document.getElementById("repeat-details");
        repeatDetails.setAttribute("collapsed", "true");
    }
}

/**
 * This function does not strictly check if the given attendee has the status
 * TENTATIVE, but also if he hasn't responded.
 *
 * @param aAttendee     The attendee to check.
 * @return              True, if the attendee hasn't responded.
 */
function isAttendeeUndecided(aAttendee) {
    return aAttendee.participationStatus != "ACCEPTED" &&
           aAttendee.participationStatus != "DECLINED" &&
           aAttendee.participationStatus != "DELEGATED";
}

/**
 * Event handler to set up the attendee-popup. This builds the popup menuitems.
 *
 * @param event         The popupshowing event
 */
function showAttendeePopup(event) {
    // Don't do anything for right/middle-clicks
    if (event.button != 0) {
        return;
    }

    var responsiveAttendees = 0;

    // anonymous helper function to
    // initialize a dynamically created menuitem
    function setup_node(aNode, aAttendee) {
        // Count attendees that have done something.
        if (!isAttendeeUndecided(aAttendee)) {
            responsiveAttendees++;
        }

        // Construct the display string from common name and/or email address.
        var re = new RegExp("^mailto:(.*)", "i");
        var name = aAttendee.commonName;
        if (name) {
            var email = aAttendee.id;
            if (email && email.length) {
                if (re.test(email)) {
                    name += ' <' + RegExp.$1 + '>';
                } else {
                    name += ' <' + email + '>';
                }
            }
        } else {
            var email = aAttendee.id;
            if (email && email.length) {
                if (re.test(email)) {
                    name = RegExp.$1;
                } else {
                    name = email;
                }
            }
        }
        aNode.setAttribute("label", name);
        aNode.setAttribute("status", aAttendee.participationStatus);
        aNode.attendee = aAttendee;
    }

    // Setup the first menuitem, this one serves as the template for further
    // menuitems.
    var attendees = window.attendees;
    var popup = document.getElementById("attendee-popup");
    var separator = document.getElementById("attendee-popup-separator");
    var template = separator.nextSibling;

    setup_node(template, attendees[0]);

    // Remove all remaining menu items after the separator and the template menu
    // item.
    while (template.nextSibling) {
        popup.removeChild(template.nextSibling);
    }

    // Add the rest of the attendees.
    for (var i = 1; i < attendees.length; i++) {
        var attendee = attendees[i];
        var newNode = template.cloneNode(true);
        setup_node(newNode, attendee);
        popup.appendChild(newNode);
    }

    // Set up the unanswered attendees item.
    if (responsiveAttendees == attendees.length) {
        document.getElementById("cmd_email_undecided")
                .setAttribute("disabled", "true");
    } else {
        document.getElementById("cmd_email_undecided")
                .removeAttribute("disabled");
    }

    // Show the popup.
    var attendeeList = document.getElementById("attendee-list");
    popup.showPopup(attendeeList, -1, -1, "context", "bottomleft", "topleft");
}

/**
 * Send Email to all attendees that haven't responded or are tentative.
 *
 * @param aAttendees    The attendees to check.
 */
function sendMailToUndecidedAttendees(aAttendees) {
    var targetAttendees = attendees.filter(isAttendeeUndecided);
    sendMailToAttendees(targetAttendees);
}

/**
 * Send Email to all given attendees.
 *
 * @param aAttendees    The attendees to send mail to.
 */
function sendMailToAttendees(aAttendees) {
    var toList = "";
    var item = saveItem();

    for each (var attendee in aAttendees) {
        if (attendee.id && attendee.id.length) {
            var email = attendee.id;
            var re = new RegExp("^mailto:(.*)", "i");
            if (email && email.length) {
                if (re.test(email)) {
                    email = RegExp.$1;
                } else {
                    email = email;
                }
            }
            // Prevent trailing commas.
            if (toList.length > 0) {
                toList += ",";
            }
            // Add this recipient id to the list.
            toList += email;
        }
    }

    // Set up the subject
    var emailSubject = calGetString("sun-calendar-event-dialog",
                                    "emailSubjectReply",
                                    [item.title]);

    sendMailTo(toList, emailSubject);
}
