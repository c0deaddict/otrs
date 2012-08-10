// --
// Core.Agent.Admin.ProcessManagement.js - provides the special module functions for the Process Management.
// Copyright (C) 2001-2012 OTRS AG, http://otrs.org/
// --
// $Id: Core.Agent.Admin.ProcessManagement.js,v 1.40 2012-08-10 11:39:53 mn Exp $
// --
// This software comes with ABSOLUTELY NO WARRANTY. For details, see
// the enclosed file COPYING for license information (AGPL). If you
// did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
// --

"use strict";

var Core = Core || {};
Core.Agent = Core.Agent || {};
Core.Agent.Admin = Core.Agent.Admin || {};

/**
 * @namespace
 * @exports TargetNS as Core.Agent.Admin.ProcessManagement
 * @description
 *      This namespace contains the special module functions for the ProcessManagement module.
 */
Core.Agent.Admin.ProcessManagement = (function (TargetNS) {

    function InitProcessPopups() {
        $('a.AsPopup').bind('click', function (Event) {
            var Matches,
                PopupType = 'Process';

            Matches = $(this).attr('class').match(/PopupType_(\w+)/);
            if (Matches) {
                PopupType = Matches[1];
            }
            
            TargetNS.ShowOverlay();

            Core.UI.Popup.OpenPopup($(this).attr('href'), PopupType);
            return false;
        });

        $('a.AsPopup_Redirect').bind('click', function (Event) {
            $('#PopupRedirect').val(1);
            $('#PopupRedirectAction').val($(this).data('action'));
            $('#PopupRedirectSubaction').val($(this).data('subaction'));
            $('#PopupRedirectID').val($(this).data('id'));
            $('#PopupRedirectEntityID').val($(this).data('entity'));

            $(this).closest('form').submit();
            return false;
        });
    }
    
    function ShowDeleteProcessConfirmationDialog($Element) {
        var DialogElement = $Element.data('dialog-element'),
            DialogTitle = $Element.data('dialog-title'),
            ProcessID = $Element.data('id');
        
        Core.UI.Dialog.ShowContentDialog(
            $('#Dialogs #' + DialogElement),
            DialogTitle,
            '240px',
            'Center',
            true,
            [
               {
                   Label: TargetNS.Localization.CancelMsg,
                   Class: 'Primary',
                   Function: function () {
                       Core.UI.Dialog.CloseDialog($('.Dialog'));
                   }
               },
               {
                   Label: TargetNS.Localization.DeleteMsg,
                   Function: function () {
                       var Data = {
                               Action: 'AdminProcessManagement',
                               Subaction: 'ProcessDelete',
                               ID: ProcessID
                           };

                       // Change the dialog to an ajax loader
                       $('.Dialog')
                           .find('.ContentFooter').empty().end()
                           .find('.InnerContent').empty().append('<div class="Spacing Center"><span class="AJAXLoader"></span></div>');
                       
                       // Call the ajax function
                       Core.AJAX.FunctionCall(Core.Config.Get('CGIHandle'), Data, function (Response) {
                           if (!Response || !Response.Success) {
                               alert(Response.Message);
                               Core.UI.Dialog.CloseDialog($('.Dialog'));
                               return;
                           }

                           Core.App.InternalRedirect({
                               Action: Data.Action
                           });
                       }, 'json');
                   }
               }
           ]
        );        
    }

    function ShowDeleteEntityConfirmationDialog($Element, EntityType, EntityName, EntityID, ItemID) {
        var DialogID = 'Delete' + EntityType + 'ConfirmationDialog',
            $DialogElement = $('#Dialogs #' + DialogID);
        
        // Update EntityName in Dialog
        $DialogElement.find('span.EntityName').text(EntityName);
        
        Core.UI.Dialog.ShowContentDialog(
            $('#Dialogs #' + DialogID),
            TargetNS.Localization.DeleteEntityTitle,
            '240px',
            'Center',
            true,
            [
               {
                   Label: TargetNS.Localization.CancelMsg,
                   Class: 'Primary',
                   Function: function () {
                       Core.UI.Dialog.CloseDialog($('.Dialog'));
                   }
               },
               {
                   Label: TargetNS.Localization.DeleteMsg,
                   Function: function () {
                       var Data = {
                               Action: 'AdminProcessManagement',
                               Subaction: 'EntityDelete',
                               EntityType: EntityType,
                               EntityID: EntityID,
                               ItemID: ItemID
                           };

                       // Change the dialog to an ajax loader
                       $('.Dialog')
                           .find('.ContentFooter').empty().end()
                           .find('.InnerContent').empty().append('<div class="Spacing Center"><span class="AJAXLoader"></span></div>');
                       
                       // Call the ajax function
                       Core.AJAX.FunctionCall(Core.Config.Get('CGIHandle'), Data, function (Response) {
                           if (!Response || !Response.Success) {
                               alert(Response.Message);
                               Core.UI.Dialog.CloseDialog($('.Dialog'));
                               return;
                           }

                           // Remove element from accordion
                           $Element.closest('li').remove();
                           Core.UI.Dialog.CloseDialog($('.Dialog'));
                       }, 'json');
                   }
               }
           ]
        );
    }

    function InitDeleteEntity() {
        $('a.DeleteEntity').bind('click.DeleteEntity', function (Event) {
            var EntityID = $(this).closest('li').data('entity'),
                EntityName = $(this).closest('li').clone().children().remove().end().text(),
                ItemID = $(this).closest('li').data('id'),
                EntityType,
                CheckResult = {};
            
            if (!EntityID.length) {
                return false;
            }
    
            if ($(this).hasClass('DeleteActivity')) {
                EntityType = 'Activity';
            }
            else if ($(this).hasClass('DeleteActivityDialog')) {
                EntityType = 'ActivityDialog';
            }
            else if ($(this).hasClass('DeleteTransition')) {
                EntityType = 'Transition';
            }
            else if ($(this).hasClass('DeleteTransitionAction')) {
                EntityType = 'TransitionAction';
            }
            
            ShowDeleteEntityConfirmationDialog($(this), EntityType, EntityName, EntityID, ItemID);
            
            return false;
        });
    }
    
    TargetNS.ProcessData = {};
    TargetNS.ProcessLayout = {};

    TargetNS.InitAccordionDnD = function () {
        function GetMousePosition(Event) {
            var PosX = 0,
                PosY = 0;
            if (!Event) {
                Event = window.event;
            }
            if (Event.pageX || Event.pageY) {
                PosX = Event.pageX;
                PosY = Event.pageY;
            }
            else if (Event.clientX || Event.clientY) {
                PosX = Event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                PosY = Event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }
            
            return {left: PosX, top: PosY};
        }
        
        function GetPositionOnCanvas(Event) {
            var $Canvas = $('#Canvas'),
                CanvasPosition,
                MousePosition,
                PosX, PosY;
            
            CanvasPosition = $Canvas.offset();
            MousePosition = GetMousePosition(Event);
            
            PosX = MousePosition.left - CanvasPosition.left;
            PosY = MousePosition.top - CanvasPosition.top;
            
            return {left: PosX, top: PosY};
        }
        
        function AddActivityToCanvas(Event, UI) {
            var Position = GetPositionOnCanvas(Event),
                EntityID = $(UI.draggable).data('entity'),
                ActivityID = $(UI.draggable).data('id'),
                Entity = TargetNS.ProcessData.Activity[EntityID],
                ProcessEntityID = $('#ProcessEntityID').val(),
                Path, PathLength = 0, PathKey;

            if (typeof Entity !== 'undefined') {
                // Check if Activity is already placed
                // If so, it can't be placed again
                Path = TargetNS.ProcessData.Process[ProcessEntityID].Path;
                
                if (!Path[EntityID]) {
                    // Update Config
                    Path[EntityID] = {};
                    // Update Layout
                    TargetNS.ProcessLayout[EntityID] = {
                        left: Position.left,
                        top: Position.top
                    };
                    // Draw Entity
                    TargetNS.Canvas.CreateActivity(EntityID, Entity.Name, ActivityID, Position.left, Position.top);
                    
                    // get Path length
                    for (PathKey in Path) {
                        if (Path.hasOwnProperty(PathKey)) {
                            PathLength++;
                        }
                    }

                    // if no other activity is on the canvas, make this activity to the startactivity
                    if (PathLength === 1) {
                        TargetNS.Canvas.SetStartActivity(EntityID);
                        TargetNS.ProcessData.Process[ProcessEntityID].StartActivity = EntityID;
                        
                    }
                }
                else {
                    alert(Core.Agent.Admin.ProcessManagement.Localization.ActivityAlreadyPlaced);
                }
            }
            else {
                Core.Exception.Throw('Error: Entity not defined!', 'ProcessError');
            }
        }
        
        function CheckIfMousePositionIsOverActivity(Position) {
            var ProcessEntityID = $('#ProcessEntityID').val(),
                Path = TargetNS.ProcessData.Process[ProcessEntityID].Path,
                ActivityMatch = false;
            
            // Loop over all assigned activities and check the position
            $.each(Path, function (Key, Value) {
                var Activity = Key,
                    ActivityPosition = TargetNS.ProcessLayout[Key];
                
                if (
                        Position.left > ActivityPosition.left &&
                        Position.left < ActivityPosition.left + 110 &&
                        Position.top > ActivityPosition.top &&
                        Position.top < ActivityPosition.top + 80
                    ) {
                    ActivityMatch = Key;
                    return;
                }
            });
            
            return ActivityMatch;
        }
        
        function AddActivityDialogToCanvas(Event, UI) {
            var Position = GetPositionOnCanvas(Event),
                EntityID = $(UI.draggable).data('entity'),
                Entity = TargetNS.ProcessData.ActivityDialog[EntityID],
                Activity, AJAXData;

            if (typeof Entity !== 'undefined') {
                // Check if mouse position is within an activity
                // If yes, add the Dialog to the Activity
                // if not, just cancel
                Activity = CheckIfMousePositionIsOverActivity(Position);
                
                if (Activity) {
                    // Remove Label, show Loader
                    TargetNS.Canvas.ShowActivityLoader(Activity);
                    
                    // Call AJAX function to add ActivityDialog to Activity
                    AJAXData = {
                        Action: 'AdminProcessManagementActivity',
                        Subaction: 'AddActivityDialog',
                        EntityID: Activity,
                        ActivityDialog: EntityID
                    };

                    Core.AJAX.FunctionCall(Core.Config.Get('CGIHandle'), AJAXData, function (Response) {
                        if (!Response || !Response.Success) {
                            if (Response && Response.Message) {
                                alert(Response.Message);
                            }
                            else {
                                alert ('Error during AJAX communication');
                            }
                            
                            TargetNS.Canvas.ShowActivityAddActivityDialogError(Activity);
                            return;
                        }
                        
                        TargetNS.Canvas.ShowActivityAddActivityDialogSuccess(Activity);
                        
                        // Update Config
                        TargetNS.ProcessData.Activity[Activity] = Response.ActivityConfig.Activity[Activity];

                    }, 'json');
                }
            }
            else {
                Core.Exception.Throw('Error: Entity not defined!', 'ProcessError');
            }
        }
        
        function AddTransitionToCanvas(Event, UI) {
            var Position = GetPositionOnCanvas(Event),
                EntityID = $(UI.draggable).data('entity'),
                Entity = TargetNS.ProcessData.Transition[EntityID],
                ProcessEntityID = $('#ProcessEntityID').val(),
                Activity,
                Path = TargetNS.ProcessData.Process[ProcessEntityID].Path;

            if (typeof Entity !== 'undefined') {
                // Check if mouse position is within an activity
                // If yes, add the Dialog to the Activity
                // if not, just cancel
                Activity = CheckIfMousePositionIsOverActivity(Position);
                
                // If this transition is already bind to this activity
                // you cannot bind it a second time
                if (Path[Activity] && typeof Path[Activity][EntityID] !== 'undefined') {
                    alert(Core.Agent.Admin.ProcessManagement.Localization.TransitionAlreadyPlaced);
                    return;
                }
                
                if (Activity) {
                    // Create dummy activity to use for initial transition
                    TargetNS.Canvas.CreateActivityDummy(100, 100);
                    
                    // Create transition between this Activity and DummyElement
                    TargetNS.Canvas.CreateTransition(Activity, 'Dummy', EntityID);
                    
                    // Remove Connection to DummyElement and delete DummyElement again
                    TargetNS.Canvas.RemoveActivityDummy();
                    
                    // Add Transition to Path
                    if (typeof Path[Activity] === 'undefined') {
                        Path[Activity] = {};
                    }
                    Path[Activity][EntityID] = {
                            ActivityID: undefined
                    }; 
                }
            }
            else {
                Core.Exception.Throw('Error: Entity not defined!', 'ProcessError');
            }
        }
        
        function AddTransitionActionToCanvas(Event, UI) {
            var EntityID = $(UI.draggable).data('entity'),
                Entity = TargetNS.ProcessData.TransitionAction[EntityID],
                Transition,
                ProcessEntityID = $('#ProcessEntityID').val(),
                Path = TargetNS.ProcessData.Process[ProcessEntityID].Path;
            
            if (typeof Entity !== 'undefined') {
                Transition = TargetNS.Canvas.DragTransitionActionTransition;
                
                // If this action is already bind to this transition
                // you cannot bind it a second time
                if (Path[Transition.StartActivity] && 
                    typeof Path[Transition.StartActivity][Transition.TransitionID] !== 'undefined' &&
                    typeof Path[Transition.StartActivity][Transition.TransitionID].Action !== 'undefined' &&
                    ($.inArray(EntityID, Path[Transition.StartActivity][Transition.TransitionID].Action) >= 0)
                ) {
                    alert(Core.Agent.Admin.ProcessManagement.Localization.TransitionActionAlreadyPlaced);
                    return;
                }
                
                if (Transition) {
                    // Add Action to Path
                    if (typeof Path[Transition.StartActivity][Transition.TransitionID].Action === 'undefined') {
                        Path[Transition.StartActivity][Transition.TransitionID].Action = [];
                    }
                    Path[Transition.StartActivity][Transition.TransitionID].Action.push(EntityID);
                }
            }
            else {
                Core.Exception.Throw('Error: Entity not defined!', 'ProcessError');
            }
        }
        
        $('#Activities li, #ActivityDialogs li, #Transitions li, #TransitionActions li').draggable({
            revert: 'invalid',
            helper: function () {
                var $Clone = $(this).clone();
                $Clone.addClass('EntityDrag').find('span').remove();
                return $Clone[0];
            },
            start: function (Event, UI) {
                var $Source = $(this),
                    SourceID = $Source.closest('ul').attr('id');
                
                if (SourceID === 'ActivityDialogs' || SourceID === 'Transitions') {
                    UI.helper.css('z-index', 1000);
                    TargetNS.Canvas.HighlightActivity('#F00');
                }
                else if (SourceID === 'TransitionActions') {
                    // Set event flag
                    TargetNS.Canvas.DragTransitionAction = true;
                    
                    // Highlight all available Transitions
                    TargetNS.Canvas.HighlightTransition('#000');
                }
                else {
                    UI.helper.css('z-index', 1000);
                }
            },
            stop: function (Event, UI) {
                var $Source = $(this),
                    SourceID = $Source.closest('ul').attr('id');
                
                if (SourceID === 'ActivityDialogs' || SourceID === 'Transitions') {
                    TargetNS.Canvas.UnhighlightActivity();
                }
                else if (SourceID === 'TransitionActions') {
                    // Reset event flag
                    TargetNS.Canvas.DragTransitionAction = false;
                    
                    // Unhighlight all available Transitions
                    TargetNS.Canvas.UnhighlightTransition();
                }
            }
        });
        
        $('#Canvas').droppable({
            accept: '#Activities li, #ActivityDialogs li, #Transitions li, #TransitionActions li',
            drop: function (Event, UI) {
                var $Source = $(UI.draggable),
                    SourceID = $Source.closest('ul').attr('id');
                
                if (SourceID === 'Activities') {
                    AddActivityToCanvas(Event, UI);
                }
                else if (SourceID === 'ActivityDialogs') {
                    AddActivityDialogToCanvas(Event, UI);
                }
                else if (SourceID === 'Transitions') {
                    AddTransitionToCanvas(Event, UI);
                }
                else if (SourceID === 'TransitionActions') {
                    AddTransitionActionToCanvas(Event, UI);
                }
                else {
                    Core.Exception.Throw('Error: No matching droppable found', 'ProcessError');
                }
            }
        });
    };
    
    TargetNS.UpdateAccordion = function () {
        // get new Accordion HTML via AJAX and replace the accordion with this HTML
        // re-initialize accordion functions (accordion, filters, DnD)
        var Data = {
                Action: 'AdminProcessManagement',
                Subaction: 'UpdateAccordion'
            };
       
        // Call the ajax function
        Core.AJAX.FunctionCall(Core.Config.Get('CGIHandle'), Data, function (Response) {
            $('ul#ProcessElements').replaceWith(Response);
            
            // Initialize Accordion in the sidebar
            Core.UI.Accordion.Init($('ul#ProcessElements'), 'li.AccordionElement h2 a', 'div.Content');

            // Initialize filters
            Core.UI.Table.InitTableFilter($('#ActivityFilter'), $('#Activities'));
            Core.UI.Table.InitTableFilter($('#ActivityDialogFilter'), $('#ActivityDialogs'));
            Core.UI.Table.InitTableFilter($('#TransitionFilter'), $('#Transitions'));
            Core.UI.Table.InitTableFilter($('#TransitionActionFilter'), $('#TransitionActions'));

            // Init DnD on Accordion
            TargetNS.InitAccordionDnD();

            // Initialize the different create and edit links/buttons
            InitProcessPopups();
            
            // Initialize the different Delete Links
            InitDeleteEntity();
        }, 'html');
    };
    
    TargetNS.HandlePopupClose = function () {
        // update accordion
        Core.Agent.Admin.ProcessManagement.UpdateAccordion();
        // redraw canvas
        Core.Agent.Admin.ProcessManagement.Canvas.Redraw();
        // remove overlay
        Core.Agent.Admin.ProcessManagement.HideOverlay();        
    };
    
    TargetNS.InitProcessEdit = function () {
        // Get Process Data
        TargetNS.ProcessData = {
                Process: Core.Config.Get('Config.Process'),
                Activity: Core.Config.Get('Config.Activity'),
                ActivityDialog: Core.Config.Get('Config.ActivityDialog'),
                Transition: Core.Config.Get('Config.Transition'),
                TransitionAction: Core.Config.Get('Config.TransitionAction')
        };
        
        TargetNS.ProcessLayout = Core.Config.Get('Config.ProcessLayout');

        // Initialize Accordion in the sidebar
        Core.UI.Accordion.Init($('ul#ProcessElements'), 'li.AccordionElement h2 a', 'div.Content');

        // Initialize filters
        Core.UI.Table.InitTableFilter($('#ActivityFilter'), $('#Activities'));
        Core.UI.Table.InitTableFilter($('#ActivityDialogFilter'), $('#ActivityDialogs'));
        Core.UI.Table.InitTableFilter($('#TransitionFilter'), $('#Transitions'));
        Core.UI.Table.InitTableFilter($('#TransitionActionFilter'), $('#TransitionActions'));

        // Init DnD on Accordion
        TargetNS.InitAccordionDnD();
        
        // Initialize the different create and edit links/buttons
        InitProcessPopups();
        
        // Initialize the different Delete Links
        InitDeleteEntity();
        
        // Initialize DeleteProcess
        $('#ProcessDelete').bind('click.ProcessDelete', function (Event) {
            ShowDeleteProcessConfirmationDialog($(Event.target).closest('a'));
            Event.stopPropagation();
            return false;
        });
        
        $('#SubmitAndContinue').bind('click', function() {
            $('#ContinueAfterSave').val(1);
            $('#Submit').click();
        });
        
        // Init submit function
        $('#Submit').bind('click', function (Event) {
            
            // get process layout and store it into a hidden field as JSON string
            $('input[name=ProcessLayout]').val(Core.JSON.Stringify(TargetNS.ProcessLayout));
            
            // get process entitiy
            var ProcessEntityID = $('#ProcessEntityID').val();

            // get process path and store it into a hidden field as JSON string
            $('input[name=Path]').val(Core.JSON.Stringify(TargetNS.ProcessData.Process[ProcessEntityID].Path));

            // get start activity and dialogs and store it into hidden fields as JSON string
            $('input[name=StartActivity]').val(TargetNS.ProcessData.Process[ProcessEntityID].StartActivity);
            $('input[name=StartActivityDialog]').val(TargetNS.ProcessData.Process[ProcessEntityID].StartActivityDialog);

            $('#ProcessForm').submit();
            return false;
        });
        
        // Init Canvas Resizing Functions
        $('#ExtendCanvasHeight').bind('click', function () {
            TargetNS.Canvas.Extend({
                Width: 0,
                Height: 150
            });
            return false;
        });

        $('#ExtendCanvasWidth').bind('click', function () {
            TargetNS.Canvas.Extend({
                Width: 150,
                Height: 0
            });
            return false;
        });
        
        // Init Diagram Canvas
        TargetNS.Canvas.Init();
    };
    
    TargetNS.InitActivityEdit = function () {
        function InitListFilter(Event, UI) {
         // only do something, if the element was removed from the right list
            if (UI.sender.attr('id') === 'AssignedActivityDialogs') {
                Core.UI.Table.InitTableFilter($('#FilterAvailableActivityDialogs'), $('#AvailableActivityDialogs'));
            }            
        }
        
        // Initialize Allocation List
        Core.UI.AllocationList.Init("#AvailableActivityDialogs, #AssignedActivityDialogs", ".AllocationList", InitListFilter);
        
        // Initialize list filter
        Core.UI.Table.InitTableFilter($('#FilterAvailableActivityDialogs'), $('#AvailableActivityDialogs'));
        
        // Init submit function
        $('#Submit').bind('click', function (Event) {
            // get assigned activity dialogs
            $('input[name=ActivityDialogs]').val(Core.JSON.Stringify(Core.UI.AllocationList.GetResult('#AssignedActivityDialogs', 'id')));
            
            $('#ActivityForm').submit();
            return false;
        });
        
        // Init popups
        InitProcessPopups();
        
        // Init handling of closing popup with the OS functionality ("X")
        $(window).unbind("beforeunload.PMPopup").bind("beforeunload.PMPopup", function () {
            window.opener.Core.Agent.Admin.ProcessManagement.HandlePopupClose();
        });
    };

    TargetNS.InitActivityDialogEdit = function () {
        function RemoveFieldDetails(Event, UI) {
            // only do something, if the element was removed from the AssignedFields list
            if (UI.sender.attr('id') === 'AssignedFields') {
                Core.UI.Table.InitTableFilter($('#FilterAvailableFields'), $('#AvailableFields'));
                $(UI.item)
                    .removeData('config')
                    .removeAttr('data-config');
            }
        }
        
        // Initialize Allocation List
        Core.UI.AllocationList.Init("#AvailableFields, #AssignedFields", ".AllocationList", RemoveFieldDetails);
        
        // Initialize list filter
        Core.UI.Table.InitTableFilter($('#FilterAvailableFields'), $('#AvailableFields'));
        
        // Initialize form submit
        $('#Submit').bind('click', function (Event) {
            var FieldConfig = Core.UI.AllocationList.GetResult('#AssignedFields', 'id'),
                FieldDetails = {};
            
            // get FieldDetails and add them to config
            $('#AssignedFields').find('li').each(function () {
                var Details = Core.JSON.Parse($(this).data('config')),
                    Field = $(this).data('id');
                
                FieldDetails[Field] = Details;
            });
            
            // get assigned activity dialogs
            $('input[name=Fields]').val(Core.JSON.Stringify(FieldConfig));
            $('input[name=FieldDetails]').val(Core.JSON.Stringify(FieldDetails));

            $('#ActivityDialogForm').submit();
            return false;
        });

        // Init Fields modal overlay
        $('.FieldDetailsOverlay').unbind('click').bind('click', function () {
            var FieldID = $(this).data('entity'),
                FieldConfig = $(this).closest('li').data('config'),
                $Element = $(this);
            
            if (typeof FieldConfig === 'string') {
                FieldConfig = Core.JSON.Parse(FieldConfig);
            }
            
            // Set field values
            $('#DialogFieldName').text($(this).closest('li').clone().find('span').remove().end().text());
            
            // Open dialog
            Core.UI.Dialog.ShowContentDialog(
                $('#Dialogs #FieldDetails'),
                TargetNS.Localization.DialogTitle,
                '100px',
                'Center',
                true,
                [
                     {
                         Label: TargetNS.Localization.SaveMsg,
                         Class: 'Primary',
                         Function: function () {
                             var FieldConfig = {};
                             
                             FieldConfig.DescShort = $('#DescShort').val();
                             FieldConfig.DescLong = $('#DescLong').val();
                             FieldConfig.DefaultValue = $('#DefaultValue').val();
                             FieldConfig.Display = $('#Display').val();
                             
                             $Element.closest('li').data('config', Core.JSON.Stringify(FieldConfig));
                             
                             Core.UI.Dialog.CloseDialog($('.Dialog'));
                         }
                     },
                     {
                         Label: TargetNS.Localization.CancelMsg,
                         Function: function () {
                             Core.UI.Dialog.CloseDialog($('.Dialog'));
                         }
                     }
                ]
            );
            
            if (typeof FieldConfig !== 'undefined') {
                $('#DescShort').val(FieldConfig.DescShort);
                $('#DescLong').val(FieldConfig.DescLong);
                $('#DefaultValue').val(FieldConfig.DefaultValue);
                $('#Display').val(FieldConfig.Display);
            }

            return false;
        });
        
        // Init handling of closing popup with the OS functionality ("X")
        $(window).unbind("beforeunload.PMPopup").bind("beforeunload.PMPopup", function () {
            window.opener.Core.Agent.Admin.ProcessManagement.HandlePopupClose();
        });
    };
    
    TargetNS.InitTransitionEdit = function () {
        
        // Replace INDEX and FIELDINDEX for first field
        // $('#PresentConditionsContainer .ConditionField').html($('.ConditionField').html().replace(/(_INDEX_|_FIELDINDEX_)/g, '1'));
        
        // Init addition of new conditions
        $('#ConditionAdd').bind('click', function() {
            // get current parent index
            var CurrentParentIndex = parseInt($(this).prev('.ConditionField').first().attr('id').replace(/Condition\[/g, '').replace(/\]/g, ''), 10),
                // in case we add a whole new condition, the fieldindex must be 1
                LastKnownFieldIndex = 1,
                // get current index
                ConditionHTML = $('#ConditionContainer').html().replace(/_INDEX_/g, CurrentParentIndex + 1).replace(/_FIELDINDEX_/g, LastKnownFieldIndex);
            
            $(ConditionHTML).insertBefore($('#ConditionAdd'));
            return false;
        });
        
        // Init removal of conditions
        $('#PresentConditionsContainer').delegate('.Remove', 'click', function() {
            if ($('#PresentConditionsContainer').find('.ConditionField').length > 1) {
                
                $(this).parent().prev('label').remove();
                $(this).parent().remove();
            }            
            else {
                alert("Sorry, the only existing condition can't be removed.");
            }
            
            return false;
        });
        
        // Init addition of new fields within conditions
        $('#PresentConditionsContainer').delegate('.ConditionFieldAdd', 'click', function() {
            // get current parent index
            var CurrentParentIndex = $(this).closest('.ConditionField').attr('id').replace(/Condition\[/g, '').replace(/\]/g, ''),
                // get the index for the newly to be added element
                // therefore, we search the preceding fieldset and the first 
                // label in it to get its "for"-attribute which contains the index 
                LastKnownFieldIndex = parseInt($(this).prev('fieldset').find('label').attr('for').replace(/ConditionFieldName\[\d+\]\[/, '').replace(/\]/, ''), 10),
                // add new field
                ConditionFieldHTML = $('#ConditionFieldContainer').html().replace(/_INDEX_/g, CurrentParentIndex).replace(/_FIELDINDEX_/g, LastKnownFieldIndex + 1);
            
            $(ConditionFieldHTML).insertBefore($(this));
            return false;
        });
        
        // Init removal of fields within conditions
        $('.Condition .Fields').delegate('.Remove', 'click', function() {
            if ($(this).closest('.Field').find('.Fields').length > 1) {
                $(this).parent().prev('label').remove();
                $(this).parent().remove();
            }            
            else {
                alert("Sorry, the only existing field can't be removed.");
            }
            
            return false;
        });
        
        $('#Submit').bind('click', function (Event) {
            var ConditionConfig = TargetNS.GetConditionConfig($('#PresentConditionsContainer').find('.ConditionField'));
            $('input[name=ConditionConfig]').val(Core.JSON.Stringify(ConditionConfig));
            $('#TransitionForm').submit();
            return false;
        });
        
        // Init handling of closing popup with the OS functionality ("X")
        $(window).unbind("beforeunload.PMPopup").bind("beforeunload.PMPopup", function () {
            window.opener.Core.Agent.Admin.ProcessManagement.HandlePopupClose();
        });
        
    };
    
    TargetNS.InitTransitionActionEdit = function () {
        // Init addition of new config parameters
        $('#ConfigAdd').bind('click', function() {
            // get the index for the newly to be added element
            // therefore, we search the preceding fieldset and the first 
            // label in it to get its "for"-attribute which contains the index 
            var LastKnownFieldIndex = parseInt($(this).prev('fieldset').find('label').attr('for').replace(/ConfigKey\[/, '').replace(/\]/, ''), 10),
                // get current index
                ConfigParamHTML = $('#ConfigParamContainer').html().replace(/_INDEX_/g, LastKnownFieldIndex + 1);

            $(ConfigParamHTML).insertBefore($('#ConfigAdd'));
            return false;
        });
        
        // Init removal of fields
        $('#ConfigParams').delegate('.Remove', 'click', function() {
            $(this).parent().remove();
            return false;
        });
        
        $('#Submit').bind('click', function (Event) {
            $('#TransitionForm').submit();
            return false;
        });
        
        // Init handling of closing popup with the OS functionality ("X")
        $(window).unbind("beforeunload.PMPopup").bind("beforeunload.PMPopup", function () {
            window.opener.Core.Agent.Admin.ProcessManagement.HandlePopupClose();
        });
    };
    
    TargetNS.InitPathEdit = function () {
        var CurrentProcessEntityID = Core.Config.Get('Config.ProcessEntityID'),
            CurrentTransitionEntityID = Core.Config.Get('Config.TransitionEntityID'),
            ActivityInfo = window.opener.Core.Agent.Admin.ProcessManagement.ProcessData.Activity,
            PathInfo = window.opener.Core.Agent.Admin.ProcessManagement.ProcessData.Process[CurrentProcessEntityID].Path,
            StartActivityEntityID = '', EndActivityEntityID = '',
            AssignedTransitionActions = [];

        // Initialize Allocation List
        Core.UI.AllocationList.Init("#AvailableTransitionActions, #AssignedTransitionActions", ".AllocationList");
        
        // store process data to hidden field for later merging
        $('#ProcessData').val(Core.JSON.Stringify(window.opener.Core.Agent.Admin.ProcessManagement.ProcessData.Process));

        // set current start and end activity (just for information purposes, not changeable)
        $.each(PathInfo, function(Activity, Transition) {
           if ( Transition[CurrentTransitionEntityID] !== undefined ) {
               
                $('#StartActivity').val(ActivityInfo[Activity].Name);
                $('#EndActivity').val(ActivityInfo[Transition[CurrentTransitionEntityID].ActivityID].Name);

                StartActivityEntityID     = Activity;
                EndActivityEntityID       = Transition[CurrentTransitionEntityID].ActivityID;
                AssignedTransitionActions = Transition[CurrentTransitionEntityID].Action;

                return false;
           }
        });

        // Set chosen Startactivity, Endactivity and Transition
        $('#Transition').val(CurrentTransitionEntityID);
        
        if (AssignedTransitionActions && AssignedTransitionActions.length) {
        
            // Display assigned Transition Actions
            $.each(AssignedTransitionActions, function(Index, TransitionActionEntityID) {
                $('#AvailableTransitionActions').find('#' + TransitionActionEntityID).remove().appendTo($('#AssignedTransitionActions'));
            });
        }
        
        $('#Submit').bind('click', function() {
            $('#PathForm').submit();
        });
        
        // On submit, pass the new config to parent window 
        $('#PathForm').submit(function() {
            var NewTransitionEntityID = $('#Transition').val(),
                NewTransitionActions  = [],
                TransitionInfo;
            
            $('#AssignedTransitionActions li').each(function() {
                NewTransitionActions.push($(this).attr('id'));    
            });
            
            // collection transition info for later merging
            TransitionInfo = {
                StartActivityEntityID  : StartActivityEntityID,
                NewTransitionEntityID  : NewTransitionEntityID,
                NewTransitionActions   : NewTransitionActions,
                NewTransitionActivityID: EndActivityEntityID
            };
                
            $('#TransitionInfo').val(Core.JSON.Stringify(TransitionInfo));
        });
        
        // Init popups
        InitProcessPopups();
        
        // Init handling of closing popup with the OS functionality ("X")
        $(window).unbind("beforeunload.PMPopup").bind("beforeunload.PMPopup", function () {
            window.opener.Core.Agent.Admin.ProcessManagement.HandlePopupClose();
        });
    };

    TargetNS.ShowOverlay = function () {
        $('<div id="Overlay" tabindex="-1">').appendTo('body');
        $('body').css({
            'overflow': 'hidden'
        });
        $('#Overlay').height($(document).height()).css('top', 0);

        // If the underlying page is perhaps to small, we extend the page to window height for the dialog
        $('body').css('min-height', $(window).height());
    };
    
    TargetNS.HideOverlay = function () {
        $('#Overlay').remove();
        $('body').css({
            'overflow': 'auto'
        });
        $('body').css('min-height', 'auto');
    };
    
    TargetNS.GetConditionConfig = function ($Conditions) {
        
        if (!$Conditions.length) {
            return {};
        }
        
        var Conditions = {},
            ConditionKey;
        
        $Conditions.each(function() {
            
            // get condition key
            ConditionKey = $(this).attr('id').replace(/(Condition\[|\])/g, '');
            
            // use condition key as key for our list
            Conditions[ConditionKey] = {
                ConditionLinking: $(this).find('.Field > select').val(),
                Fields: {}
            };
            
            // get all fields of the current condition
            $(this).find('fieldset.Fields').each(function() {
                
                var FieldKey = $(this).find('label').attr('for').replace(/(ConditionFieldName\[\d+\]\[|\])/g, '');
                Conditions[ConditionKey].Fields[FieldKey] = {
                    Name  : $(this).find('input').first().val(),
                    Type  : $(this).find('select').val(),
                    Value : $(this).find('input').last().val()
                };
            });
            
        });

        return Conditions;
    };
    
    
    TargetNS.UpdateConfig = function (Config) {
        if (typeof Config === 'undefined') {
            return false;
        }
        
        // Update config from e.g. popup windows

        // Update Process 
        if (typeof Config.Process !== 'undefined') {
            TargetNS.ProcessData.Process = Config.Process;
        }
        
        // Update Activities
        if (typeof Config.Activity !== 'undefined') {
            $.each(Config.Activity, function (Key, Value) {
                TargetNS.ProcessData.Activity[Key] = Value;
            });
        }
        
        // Update Activity Dialogs
        if (typeof Config.ActivityDialog !== 'undefined') {
            $.each(Config.ActivityDialog, function (Key, Value) {
                TargetNS.ProcessData.ActivityDialog[Key] = Value;
            });
        }

        // Update Transitions
        if (typeof Config.Transition !== 'undefined') {
            $.each(Config.Transition, function (Key, Value) {
                TargetNS.ProcessData.Transition[Key] = Value;
            });
        }

        // Update Transition Actions
        if (typeof Config.TransitionAction !== 'undefined') {
            $.each(Config.TransitionAction, function (Key, Value) {
                TargetNS.ProcessData.TransitionAction[Key] = Value;
            });
        }
    };
    
    return TargetNS;
}(Core.Agent.Admin.ProcessManagement || {}));